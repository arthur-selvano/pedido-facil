import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveMercadoPagoToken,
  getMercadoPagoPayment,
  mapMercadoPagoStatus,
} from "@/lib/mercadopago";
import { notifyPaymentConfirmed } from "@/lib/whatsapp";

export async function POST(request) {
  try {
    const url = new URL(request.url);
    const storeIdParam = url.searchParams.get("store_id");
    const body = await request.json().catch(() => ({}));

    const topic =
      body?.type || body?.topic || url.searchParams.get("type") || url.searchParams.get("topic");

    if (topic && topic !== "payment") {
      return NextResponse.json({ received: true, ignored: true });
    }

    const paymentId =
      body?.data?.id ||
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      body?.id;

    if (!paymentId) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const storeId = Number(storeIdParam);
    if (!storeId || Number.isNaN(storeId)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const store = await prisma.stores.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        name: true,
        phone: true,
        whatsapp_instance: true,
        mp_access_token: true,
      },
    });

    if (!store) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const accessToken = resolveMercadoPagoToken(store);
    if (!accessToken) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const payment = await getMercadoPagoPayment(accessToken, paymentId);
    if (!payment) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const orderId = Number(payment.external_reference);
    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json({ received: true, ignored: true });
    }

    const mappedStatus = mapMercadoPagoStatus(payment.status);

    if (mappedStatus === "paid") {
      // Atualiza apenas se ainda não estava pago, evitando notificações duplicadas.
      const { count } = await prisma.orders.updateMany({
        where: {
          id: orderId,
          store_id: store.id,
          payment_status: { not: "paid" },
        },
        data: {
          payment_status: "paid",
          payment_id: String(payment.id),
        },
      });

      if (count > 0) {
        const order = await prisma.orders.findFirst({
          where: { id: orderId, store_id: store.id },
        });
        if (order) {
          after(() => notifyPaymentConfirmed({ order, store }));
        }
      }
    } else {
      await prisma.orders.updateMany({
        where: {
          id: orderId,
          store_id: store.id,
          payment_status: { not: "paid" },
        },
        data: {
          payment_status: mappedStatus,
          payment_id: String(payment.id),
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[mercadopago] Erro no webhook:", error);
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
