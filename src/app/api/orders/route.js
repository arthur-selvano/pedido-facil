import { NextResponse } from "next/server";
import { query } from "@/lib/db";

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

    const storeResult = await query(
      "SELECT id, delivery_fee FROM stores WHERE id = $1",
      [store_id],
    );

    if (storeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
      );
    }

    const store = storeResult.rows[0];

    const productIds = items.map((item) => Number(item.product_id));

    const productsResult = await query(
      `SELECT id, name, price
       FROM products
       WHERE store_id = $1 AND available = TRUE AND id = ANY($2::int[])`,
      [store.id, productIds],
    );

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const dbProduct = productsResult.rows.find(
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
      finalDeliveryType === "delivery" ? Number(store.delivery_fee) : 0;
    const total = subtotal + deliveryFee;

    const orderResult = await query(
      `INSERT INTO orders (
        store_id, customer_name, customer_phone, delivery_type,
        address, payment_method, notes, subtotal, delivery_fee, total
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        store.id,
        customer_name.trim(),
        customer_phone.trim(),
        finalDeliveryType,
        finalDeliveryType === "delivery" ? address.trim() : null,
        payment_method,
        notes ? notes.trim() : null,
        subtotal,
        deliveryFee,
        total,
      ],
    );

    const createdOrder = orderResult.rows[0];

    for (const item of validatedItems) {
      await query(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          createdOrder.id,
          item.product_id,
          item.product_name,
          item.unit_price,
          item.quantity,
        ],
      );
    }

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
