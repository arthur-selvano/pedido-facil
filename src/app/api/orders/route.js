import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { normalizeWhatsAppNumber, notifyOrderStatus } from "@/lib/whatsapp";
import { resolveMercadoPagoToken } from "@/lib/mercadopago";
import {
  checkRateLimit,
  rateLimitResponse,
  signOrderAccessToken,
} from "@/lib/security";

export async function POST(request) {
  try {
    const rl = checkRateLimit(request, {
      key: "orders:create",
      limit: 15,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }
    const {
      store_id,
      customer_name,
      customer_phone,
      delivery_type,
      address,
      payment_method,
      change_for,
      notes,
      items,
    } = await request.json();

    if (
      !store_id ||
      !customer_name ||
      !customer_name.trim() ||
      !customer_phone ||
      !customer_phone.trim() ||
      !payment_method ||
      !Array.isArray(items) ||
      items.length === 0 ||
      items.length > 50
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha todos os dados obrigatórios e adicione itens ao pedido.",
        },
        { status: 400 },
      );
    }

    if (!normalizeWhatsAppNumber(customer_phone)) {
      return NextResponse.json(
        {
          error:
            "Informe um número de WhatsApp válido com DDD (ex.: 34999999999).",
        },
        { status: 400 },
      );
    }

    const finalDeliveryType =
      delivery_type === "pickup" ? "pickup" : "delivery";

    if (finalDeliveryType === "delivery" && (!address || !address.trim())) {
      return NextResponse.json(
        { error: "Informe o endereço completo para entrega." },
        { status: 400 },
      );
    }

    const store = await prisma.stores.findUnique({
      where: { id: Number(store_id) },
      select: {
        id: true,
        name: true,
        slug: true,
        phone: true,
        delivery_fee: true,
        is_open: true,
        whatsapp_instance: true,
        mp_access_token: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
      );
    }

    if (!store.is_open) {
      return NextResponse.json(
        {
          error: "A loja está fechada no momento e não está aceitando pedidos.",
        },
        { status: 400 },
      );
    }

    const productIds = items.map((item) => Number(item.product_id));

    const dbProducts = await prisma.products.findMany({
      where: {
        store_id: store.id,
        available: true,
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        price: true,
      },
    });

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const dbProduct = dbProducts.find(
        (p) => p.id === Number(item.product_id),
      );
      const quantity = Number(item.quantity);

      if (
        !dbProduct ||
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 99
      ) {
        return NextResponse.json(
          {
            error:
              "Um ou mais itens do carrinho são inválidos ou estão indisponíveis.",
          },
          { status: 400 },
        );
      }

      const unitPrice = Number(dbProduct.price);
      subtotal += unitPrice * quantity;

      validatedItems.push({
        product_id: dbProduct.id,
        product_name: dbProduct.name,
        unit_price: unitPrice,
        quantity,
      });
    }

    const isOnlinePayment = payment_method === "online";
    const mpAccessToken = isOnlinePayment
      ? resolveMercadoPagoToken(store)
      : null;

    if (isOnlinePayment && !mpAccessToken) {
      return NextResponse.json(
        {
          error:
            "O pagamento online não está disponível nesta loja no momento. Escolha pagar na entrega ou retirada.",
        },
        { status: 400 },
      );
    }

    const deliveryFee =
      finalDeliveryType === "delivery" ? Number(store.delivery_fee || 0) : 0;
    const total = subtotal + deliveryFee;

    let parsedChangeFor = null;
    if (
      payment_method === "cash" &&
      change_for !== undefined &&
      change_for !== null &&
      String(change_for).trim() !== ""
    ) {
      const normalized = Number(String(change_for).replace(",", "."));
      if (!Number.isFinite(normalized) || normalized < total) {
        return NextResponse.json(
          {
            error:
              "O valor para troco deve ser maior ou igual ao total do pedido.",
          },
          { status: 400 },
        );
      }
      parsedChangeFor = normalized;
    }

    const createdOrder = await prisma.orders.create({
      data: {
        store_id: store.id,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        delivery_type: finalDeliveryType,
        address: finalDeliveryType === "delivery" ? address.trim() : null,
        payment_method,
        payment_status: isOnlinePayment ? "pending" : "unpaid",
        change_for: parsedChangeFor,
        notes: notes ? notes.trim() : null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        order_items: {
          create: validatedItems,
        },
      },
    });

    // Envia a confirmação no WhatsApp do cliente sem atrasar a resposta.
    after(() =>
      notifyOrderStatus({
        order: createdOrder,
        store,
        status: "pending",
        items: validatedItems,
      }),
    );

    return NextResponse.json(
      {
        message: "Pedido realizado com sucesso!",
        order: createdOrder,
        payment_token: signOrderAccessToken(createdOrder.id),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao registrar pedido:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const store = await prisma.stores.findFirst({
      where: { user_id: decoded.userId },
      select: {
        id: true,
        name: true,
        phone: true,
        slug: true,
        delivery_fee: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const orders = await prisma.orders.findMany({
      where: { store_id: store.id },
      orderBy: { created_at: "desc" },
      include: {
        order_items: true,
      },
    });

    const ordersWithItems = orders.map(({ order_items, ...order }) => ({
      ...order,
      items: order_items,
    }));

    return NextResponse.json({ orders: ordersWithItems, store });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
