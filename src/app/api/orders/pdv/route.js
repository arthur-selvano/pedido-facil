import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { normalizeWhatsAppNumber, notifyOrderStatus } from "@/lib/whatsapp";

const VALID_DELIVERY_TYPES = new Set(["counter", "pickup", "delivery"]);
const VALID_PAYMENT_METHODS = new Set([
  "cash",
  "pix",
  "credit_card",
  "debit_card",
  "card",
]);
const VALID_INITIAL_STATUSES = new Set(["pending", "preparing", "delivered"]);

export async function POST(request) {
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
        delivery_fee: true,
        whatsapp_instance: true,
      },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
      );
    }

    const {
      customer_name,
      customer_phone,
      delivery_type = "counter",
      address,
      payment_method = "cash",
      payment_status = "unpaid",
      change_for,
      status = "preparing",
      notes,
      items,
    } = await request.json();

    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json(
        { error: "Adicione entre 1 e 50 itens ao pedido." },
        { status: 400 },
      );
    }

    const finalDeliveryType = VALID_DELIVERY_TYPES.has(delivery_type)
      ? delivery_type
      : "counter";

    if (finalDeliveryType === "delivery" && (!address || !address.trim())) {
      return NextResponse.json(
        { error: "Informe o endereço completo para pedidos de entrega." },
        { status: 400 },
      );
    }

    if (!VALID_PAYMENT_METHODS.has(payment_method)) {
      return NextResponse.json(
        { error: "Forma de pagamento inválida." },
        { status: 400 },
      );
    }

    const finalStatus = VALID_INITIAL_STATUSES.has(status)
      ? status
      : "preparing";
    const finalPaymentStatus = payment_status === "paid" ? "paid" : "unpaid";

    const cleanName =
      typeof customer_name === "string" && customer_name.trim()
        ? customer_name.trim().slice(0, 150)
        : finalDeliveryType === "counter"
          ? "Cliente Balcão"
          : "Cliente";

    const cleanPhone =
      typeof customer_phone === "string"
        ? customer_phone.trim().slice(0, 30)
        : "";

    const productIds = items.map((item) => Number(item.product_id));
    const dbProducts = await prisma.products.findMany({
      where: {
        store_id: store.id,
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
          { error: "Um ou mais itens selecionados são inválidos." },
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
        customer_name: cleanName,
        customer_phone: cleanPhone,
        delivery_type: finalDeliveryType,
        address: finalDeliveryType === "delivery" ? address.trim() : null,
        payment_method,
        payment_status: finalPaymentStatus,
        change_for: parsedChangeFor,
        notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        status: finalStatus,
        order_items: {
          create: validatedItems,
        },
      },
      include: {
        order_items: true,
      },
    });

    // Se o atendente informou um WhatsApp válido, notifica o cliente em segundo plano.
    if (cleanPhone && normalizeWhatsAppNumber(cleanPhone)) {
      after(() =>
        notifyOrderStatus({
          order: createdOrder,
          store,
          status: finalStatus,
          items: validatedItems,
        }),
      );
    }

    const { order_items, ...orderFields } = createdOrder;

    return NextResponse.json(
      {
        message: "Pedido PDV registrado com sucesso!",
        order: {
          ...orderFields,
          items: order_items,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao registrar pedido PDV:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
