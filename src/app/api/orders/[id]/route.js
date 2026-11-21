import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const result = await query("SELECT id FROM stores WHERE user_id = $1", [
      decoded.userId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const store = result.rows[0];

    const { status } = await request.json();

    const validStatuses = [
      "pending",
      "preparing",
      "out_for_delivery",
      "delivered",
      "canceled",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    const orderId = Number(id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: "ID do pedido inválido." },
        { status: 400 },
      );
    }

    const updateResult = await query(
      `UPDATE orders
       SET status = $1
       WHERE id = $2 AND store_id = $3
       RETURNING *`,
      [status, orderId, store.id],
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      message: "Status atualizado com sucesso!",
      order: updateResult.rows[0],
    });
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
