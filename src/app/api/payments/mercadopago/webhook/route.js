import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveMercadoPagoToken,
  getMercadoPagoOrder,
  mapMercadoPagoOrderStatus,
} from "@/lib/mercadopago";
import { notifyPaymentConfirmed } from "@/lib/whatsapp";
import { verifyMercadoPagoWebhookSignature } from "@/lib/security";

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const storeIdParam = url.searchParams.get("store_id");
    const body = await request.json().catch(() => ({}));

    const topic =
      body?.type ||
      body?.topic ||
      url.searchParams.get("type") ||
      url.searchParams.get("topic");
    const action = typeof body?.action === "string" ? body.action : "";

    const isOrderEvent =
      topic === "order" || action.startsWith("order.");

    if ((topic || action) && !isOrderEvent) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const mpOrderId =
      body?.data?.id ||
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      body?.id;

    if (!mpOrderId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const sigCheck = verifyMercadoPagoWebhookSignature(request, mpOrderId);
    if (!sigCheck.valid) {
      console.warn(
        `[mercadopago] Webhook rejeitado por assinatura inválida (${sigCheck.reason}).`,
      );
      return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });
    }

    const storeIdFromQuery = Number(storeIdParam);
    let localOrder = null;

    // Localiza o pedido pelo payment_id (ORD...) ou external_reference
    if (storeIdFromQuery && !Number.isNaN(storeIdFromQuery)) {
      localOrder = await prisma.orders.findFirst({
        where: {
          store_id: storeIdFromQuery,
          payment_id: String(mpOrderId),
        },
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
    } else {
      localOrder = await prisma.orders.findFirst({
        where: { payment_id: String(mpOrderId) },
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
    }

    if (!localOrder && body?.data?.external_reference) {
      const extId = Number(body.data.external_reference);
      if (extId && !Number.isNaN(extId)) {
        localOrder = await prisma.orders.findUnique({
          where: { id: extId },
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
      }
    }

    if (!localOrder || !localOrder.stores) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const store = localOrder.stores;
    const accessToken = resolveMercadoPagoToken(store);
    if (!accessToken) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const mpOrder = await getMercadoPagoOrder(accessToken, mpOrderId);
    if (!mpOrder) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const externalOrderId = Number(mpOrder.external_reference) || localOrder.id;
    const mappedStatus = mapMercadoPagoOrderStatus(mpOrder);

    if (mappedStatus === "paid") {
      // Atualiza apenas se ainda não estava pago, evitando notificações duplicadas.
      const { count } = await prisma.orders.updateMany({
        where: {
          id: externalOrderId,
          store_id: store.id,
          payment_status: { not: "paid" },
        },
        data: {
          payment_status: "paid",
          payment_id: String(mpOrder.id),
          payment_url: null,
        },
      });

      if (count > 0) {
        const updatedOrder = await prisma.orders.findFirst({
          where: { id: externalOrderId, store_id: store.id },
        });
        if (updatedOrder) {
          after(() => notifyPaymentConfirmed({ order: updatedOrder, store }));
        }
      }
    } else {
      await prisma.orders.updateMany({
        where: {
          id: externalOrderId,
          store_id: store.id,
          payment_status: { not: "paid" },
        },
        data: {
          payment_status: mappedStatus,
          payment_id: String(mpOrder.id),
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[mercadopago] Erro no webhook de Orders:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
