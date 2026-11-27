import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import {
  resolveMercadoPagoToken,
  createPixOrder,
  createCardOrder,
} from "@/lib/mercadopago";
import { notifyPaymentConfirmed } from "@/lib/whatsapp";
import {
  checkRateLimit,
  rateLimitResponse,
  verifyOrderAccessToken,
} from "@/lib/security";

export async function POST(request) {
  try {
    const rl = checkRateLimit(request, {
      key: "payments:mp:orders",
      limit: 20,
      windowMs: 10 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const body = await request.json().catch(() => null);
    const orderId = Number(body?.order_id);
    const paymentToken = body?.payment_token;
    const method = body?.method === "card" ? "card" : "pix";

    if (!orderId || Number.isNaN(orderId)) {
      return NextResponse.json(
        { error: "ID do pedido inválido." },
        { status: 400 },
      );
    }

    if (!verifyOrderAccessToken(orderId, paymentToken)) {
      return NextResponse.json(
        { error: "Token de pagamento inválido ou ausente." },
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

    if (order.payment_method !== "online") {
      return NextResponse.json(
        { error: "Este pedido não utiliza pagamento online." },
        { status: 400 },
      );
    }

    if (order.payment_status === "paid") {
      return NextResponse.json({
        orderId: order.id,
        mpOrderId: order.payment_id,
        payment_status: "paid",
        status_detail: "accredited",
        pix: null,
      });
    }

    const accessToken = resolveMercadoPagoToken(order.stores);
    if (!accessToken) {
      return NextResponse.json(
        { error: "Pagamento online não configurado nesta loja." },
        { status: 400 },
      );
    }

    let result;

    if (method === "pix") {
      result = await createPixOrder({
        accessToken,
        order,
        store: order.stores,
        payerEmail: body?.payer_email,
      });
    } else {
      const card = body?.card;
      if (!card?.token || !card?.payment_method_id) {
        return NextResponse.json(
          {
            error:
              "Dados do cartão incompletos. Preencha o formulário novamente.",
          },
          { status: 400 },
        );
      }

      result = await createCardOrder({
        accessToken,
        order,
        store: order.stores,
        card: {
          token: card.token,
          paymentMethodId: card.payment_method_id,
          paymentTypeId: card.payment_type_id,
          installments: card.installments,
          payerEmail: card.payer_email || body?.payer_email,
          identification: card.identification,
        },
      });
    }

    if (result.mappedStatus === "paid") {
      const { count } = await prisma.orders.updateMany({
        where: {
          id: order.id,
          payment_status: { not: "paid" },
        },
        data: {
          payment_status: "paid",
          payment_id: String(result.mpOrderId),
          payment_url: null,
        },
      });

      if (count > 0) {
        after(() => notifyPaymentConfirmed({ order, store: order.stores }));
      }
    } else {
      await prisma.orders.updateMany({
        where: {
          id: order.id,
          payment_status: { not: "paid" },
        },
        data: {
          payment_status: result.mappedStatus,
          payment_id: String(result.mpOrderId),
          payment_url: result.pix?.ticketUrl || null,
        },
      });
    }

    return NextResponse.json({
      orderId: order.id,
      mpOrderId: result.mpOrderId,
      payment_status: result.mappedStatus,
      status_detail: result.statusDetail,
      pix: result.pix || null,
    });
  } catch (error) {
    console.error("[mercadopago] Erro ao processar order:", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível processar o pagamento agora. Confira os dados e tente novamente.",
      },
      { status: 502 },
    );
  }
}
