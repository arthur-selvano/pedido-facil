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

    const { status, payment_status } = await request.json();

    const validStatuses = [
      "pending",
      "preparing",
      "out_for_delivery",
      "delivered",
      "canceled",
    ];
    const validPaymentStatuses = ["paid", "unpaid"];

    if (status === undefined && payment_status === undefined) {
      return NextResponse.json(
        { error: "Informe o status ou o status de pagamento para atualizar." },
        { status: 400 },
      );
    }

    if (status !== undefined && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido." }, { status: 400 });
    }

    if (
      payment_status !== undefined &&
      !validPaymentStatuses.includes(payment_status)
    ) {
      return NextResponse.json(
        { error: "Status de pagamento inválido." },
        { status: 400 },
      );
    }

    const orderId = Number(id);
    if (isNaN(orderId)) {
      return NextResponse.json(
        { error: "ID do pedido inválido." },
        { status: 400 },
      );
    }

    const existingOrder = await prisma.orders.findFirst({
      where: { id: orderId, store_id: store.id },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    const updateData = {};
    const statusChanged =
      status !== undefined && status !== existingOrder.status;

    if (status !== undefined) {
      updateData.status = status;
    }

    if (payment_status !== undefined) {
      if (existingOrder.payment_method === "online") {
        return NextResponse.json(
          {
            error:
              "O status de pagamento online é controlado automaticamente pelo Mercado Pago.",
          },
          { status: 400 },
        );
      }
      updateData.payment_status = payment_status;
    }

    const updatedOrder = await prisma.orders.update({
      where: { id: orderId },
      data: updateData,
    });

    if (statusChanged && updatedOrder.customer_phone) {
      // Notifica o cliente no WhatsApp sem atrasar a resposta do painel.
      after(() =>
        notifyOrderStatus({ order: updatedOrder, store, status }),
      );
    }

    return NextResponse.json({
      message: "Pedido atualizado com sucesso!",
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
