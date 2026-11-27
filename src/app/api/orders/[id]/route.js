import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { notifyOrderStatus } from "@/lib/whatsapp";
import { NextResponse, after } from "next/server";

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
      select: { id: true, name: true, phone: true, whatsapp_instance: true },
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

    // Atualiza somente se o status for diferente do atual, evitando mensagens
    // duplicadas no WhatsApp em cliques repetidos ou requisições concorrentes.
    const { count } = await prisma.orders.updateMany({
      where: {
        id: orderId,
        store_id: store.id,
        status: { not: status },
      },
      data: { status },
    });

    const updatedOrder = await prisma.orders.findFirst({
      where: { id: orderId, store_id: store.id },
    });

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    const statusChanged = count > 0;

    if (statusChanged) {
      // Notifica o cliente no WhatsApp sem atrasar a resposta do painel.
      after(() =>
        notifyOrderStatus({ order: updatedOrder, store, status }),
      );
    }

    return NextResponse.json({
      message: "Status atualizado com sucesso!",
      order: updatedOrder,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do pedido:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
