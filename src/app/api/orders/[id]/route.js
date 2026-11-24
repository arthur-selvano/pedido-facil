import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function PATCH(request, { params }) {
  try {
    const { id } = await params;
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

    const updatedOrder = await prisma.orders.update({
      where: {
        id: orderId,
        store_id: store.id,
      },
      data: { status },
    });

    return NextResponse.json({
      message: "Status atualizado com sucesso!",
      order: updatedOrder,
    });
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    console.error("Erro ao atualizar status do pedido:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
