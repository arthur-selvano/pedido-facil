import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(request) {
  try {
    const {
      store_id,
      customer_name,
      customer_phone,
      delivery_type,
      address,
      payment_method,
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
      items.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha todos os dados obrigatórios e adicione itens ao pedido.",
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
      select: { id: true, delivery_fee: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
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

      if (!dbProduct || isNaN(quantity) || quantity <= 0) {
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

    const deliveryFee =
      finalDeliveryType === "delivery" ? Number(store.delivery_fee || 0) : 0;
    const total = subtotal + deliveryFee;

    const createdOrder = await prisma.orders.create({
      data: {
        store_id: store.id,
        customer_name: customer_name.trim(),
        customer_phone: customer_phone.trim(),
        delivery_type: finalDeliveryType,
        address: finalDeliveryType === "delivery" ? address.trim() : null,
        payment_method,
        notes: notes ? notes.trim() : null,
        subtotal,
        delivery_fee: deliveryFee,
        total,
        order_items: {
          create: validatedItems,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Pedido realizado com sucesso!",
        order: createdOrder,
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
      select: { id: true },
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

    return NextResponse.json({ orders: ordersWithItems });
  } catch (error) {
    console.error("Erro ao listar pedidos:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
