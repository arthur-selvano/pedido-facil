import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveMercadoPagoToken,
  getMercadoPagoPayment,
  findLatestPaymentByOrder,
  mapMercadoPagoStatus,
} from "@/lib/mercadopago";
import { notifyPaymentConfirmed } from "@/lib/whatsapp";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const orderId = Number(url.searchParams.get("order_id"));
    const paymentIdParam = url.searchParams.get("payment_id");

    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json(
        { error: "ID do pedido inválido." },
        { status: 400 },
      );
    }

    const order = await prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        stores: {
          select: {
            id: true,
            name: true,
            phone: true,
            whatsapp_instance: true,
            mp_access_token: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pedido não encontrado." },
        { status: 404 },
      );
    }

    let currentPaymentStatus = order.payment_status;

    if (order.payment_method === "online" && currentPaymentStatus !== "paid") {
      const accessToken = resolveMercadoPagoToken(order.stores);

      if (accessToken) {
        let payment = null;

        try {
          if (paymentIdParam && /^\d+$/.test(paymentIdParam)) {
            const candidate = await getMercadoPagoPayment(
              accessToken,
              paymentIdParam,
            );
            if (
              candidate &&
              String(candidate.external_reference) === String(order.id)
            ) {
              payment = candidate;
            }
          }

          if (!payment) {
            payment = await findLatestPaymentByOrder(accessToken, order.id);
          }

          if (payment) {
            const mappedStatus = mapMercadoPagoStatus(payment.status);

            if (mappedStatus === "paid") {
              const { count } = await prisma.orders.updateMany({
                where: {
                  id: order.id,
                  payment_status: { not: "paid" },
                },
                data: {
                  payment_status: "paid",
                  payment_id: String(payment.id),
                },
              });
              currentPaymentStatus = "paid";

              if (count > 0) {
                after(() =>
                  notifyPaymentConfirmed({ order, store: order.stores }),
                );
              }
            } else if (mappedStatus !== currentPaymentStatus) {
              await prisma.orders.updateMany({
                where: {
                  id: order.id,
                  payment_status: { not: "paid" },
                },
                data: {
                  payment_status: mappedStatus,
                  payment_id: String(payment.id),
                },
              });
              currentPaymentStatus = mappedStatus;
            }
          }
        } catch (err) {
          console.error(
            `[mercadopago] Falha ao sincronizar pagamento do pedido #${order.id}:`,
            err,
          );
        }
      }
    }

    return NextResponse.json({
      orderId: order.id,
      status: order.status,
      payment_method: order.payment_method,
      payment_status: currentPaymentStatus,
      total: Number(order.total),
      payment_url:
        currentPaymentStatus === "paid" ? null : order.payment_url || null,
    });
  } catch (error) {
    console.error("Erro ao consultar status do pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
