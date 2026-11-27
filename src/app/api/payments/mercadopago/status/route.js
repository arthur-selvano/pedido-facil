import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveMercadoPagoToken,
  getMercadoPagoOrder,
  mapMercadoPagoOrderStatus,
  extractPixDataFromOrder,
} from "@/lib/mercadopago";
import { notifyPaymentConfirmed } from "@/lib/whatsapp";
import {
  checkRateLimit,
  rateLimitResponse,
  verifyOrderAccessToken,
} from "@/lib/security";

export async function GET(request) {
  try {
    const rl = checkRateLimit(request, {
      key: "payments:mp:status",
      limit: 60,
      windowMs: 5 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const url = new URL(request.url);
    const orderId = Number(url.searchParams.get("order_id"));
    const token = url.searchParams.get("token");

    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json(
        { error: "ID do pedido inválido." },
        { status: 400 },
      );
    }

    if (!verifyOrderAccessToken(orderId, token)) {
      return NextResponse.json(
        { error: "Não autorizado para consultar este pedido." },
        { status: 403 },
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
    let statusDetail = null;
    let pix = null;

    if (
      order.payment_method === "online" &&
      currentPaymentStatus !== "paid" &&
      order.payment_id
    ) {
      const accessToken = resolveMercadoPagoToken(order.stores);

      if (accessToken) {
        try {
          const mpOrder = await getMercadoPagoOrder(
            accessToken,
            order.payment_id,
          );

          if (mpOrder) {
            const mappedStatus = mapMercadoPagoOrderStatus(mpOrder);
            statusDetail =
              mpOrder?.transactions?.payments?.[0]?.status_detail ||
              mpOrder?.status_detail ||
              null;

            if (mappedStatus === "pending") {
              pix = extractPixDataFromOrder(mpOrder);
            }

            if (mappedStatus === "paid") {
              const { count } = await prisma.orders.updateMany({
                where: {
                  id: order.id,
                  payment_status: { not: "paid" },
                },
                data: {
                  payment_status: "paid",
                  payment_url: null,
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
                },
              });
              currentPaymentStatus = mappedStatus;
            }
          }
        } catch (err) {
          console.error(
            `[mercadopago] Falha ao sincronizar order do pedido #${order.id}:`,
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
      status_detail: statusDetail,
      total: Number(order.total),
      mp_order_id: order.payment_id || null,
      pix,
    });
  } catch (error) {
    console.error("Erro ao consultar status do pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
