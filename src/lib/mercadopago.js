import crypto from "node:crypto";

/**
 * Integração com Mercado Pago Orders API (/v1/orders) para Checkout Transparente
 * (PIX e Cartão direto no site, sem redirecionamento).
 *
 * Cada loja pode configurar seu próprio Access Token e Public Key no painel (/dashboard),
 * salvos em `stores.mp_access_token` e `stores.mp_public_key`.
 * Opcionalmente, `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_PUBLIC_KEY`
 * no `.env` funcionam como fallback global da plataforma.
 */

const MP_API_BASE = "https://api.mercadopago.com";
const MP_TIMEOUT_MS = 15000;

export function resolveMercadoPagoToken(store) {
  const storeToken = store?.mp_access_token?.trim();
  if (storeToken) return storeToken;

  const fallbackToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  return fallbackToken || null;
}

export function resolveMercadoPagoPublicKey(store) {
  const storeKey = store?.mp_public_key?.trim();
  if (storeKey) return storeKey;

  const fallbackKey =
    process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ||
    process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim();
  return fallbackKey || null;
}

export function hasOnlinePaymentEnabled(store) {
  return resolveMercadoPagoToken(store) !== null;
}

/**
 * Mapeia o status de uma Order (/v1/orders) do Mercado Pago para o status interno do pedido.
 */
export function mapMercadoPagoOrderStatus(mpOrder) {
  const orderStatus = mpOrder?.status;
  const paymentStatus = mpOrder?.transactions?.payments?.[0]?.status;
  const status = orderStatus || paymentStatus;

  switch (status) {
    case "processed":
    case "approved":
      return "paid";
    case "failed":
    case "canceled":
    case "cancelled":
    case "expired":
    case "rejected":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
}

/**
 * Extrai dados de PIX (QR Code e Copia e Cola) de uma Order (/v1/orders).
 */
export function extractPixDataFromOrder(mpOrder) {
  const payment = mpOrder?.transactions?.payments?.[0];
  const pm = payment?.payment_method || {};

  if (!pm.qr_code && !pm.qr_code_base64 && !pm.ticket_url) {
    return null;
  }

  return {
    qrCode: pm.qr_code || null,
    qrCodeBase64: pm.qr_code_base64 || null,
    ticketUrl: pm.ticket_url || null,
  };
}

/**
 * Gera um e-mail válido de pagador caso o cliente não tenha informado um.
 */
export function resolvePayerEmail(email, customerPhone, orderId) {
  const trimmed = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return trimmed;
  }

  const digits = String(customerPhone || "").replace(/\D/g, "");
  const suffix = digits || `pedido${orderId || Date.now()}`;
  return `cliente.${suffix}@pedidofacil.com.br`;
}

/**
 * Valida um Access Token consultando GET /users/me no Mercado Pago.
 */
export async function validateMercadoPagoToken(accessToken) {
  const cleanToken = typeof accessToken === "string" ? accessToken.trim() : "";
  if (!cleanToken) {
    return { valid: false, error: "Informe o Access Token do Mercado Pago." };
  }

  const response = await fetch(`${MP_API_BASE}/users/me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cleanToken}`,
    },
    signal: AbortSignal.timeout(MP_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      valid: false,
      error:
        "Access Token inválido ou expirado. Confira suas credenciais no painel do Mercado Pago.",
    };
  }

  const data = await response.json().catch(() => ({}));

  return {
    valid: true,
    isSandbox: cleanToken.startsWith("TEST-"),
    account: {
      id: data.id || null,
      nickname: data.nickname || null,
      email: data.email || null,
    },
  };
}

/**
 * Cria uma Order PIX na API /v1/orders do Mercado Pago.
 */
export async function createPixOrder({
  accessToken,
  order,
  store,
  payerEmail,
}) {
  const amount = Number(order.total).toFixed(2);
  const idempotencyKey = `pf-order-${order.id}-pix-${crypto.randomUUID()}`;

  const payload = {
    type: "online",
    processing_mode: "automatic",
    total_amount: amount,
    external_reference: String(order.id),
    description: `Pedido #${order.id} - ${store.name}`.slice(0, 250),
    payer: {
      email: resolvePayerEmail(payerEmail, order.customer_phone, order.id),
    },
    transactions: {
      payments: [
        {
          amount,
          payment_method: {
            id: "pix",
            type: "bank_transfer",
          },
        },
      ],
    },
  };

  const response = await fetch(`${MP_API_BASE}/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(MP_TIMEOUT_MS),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      data?.errors?.[0]?.message ||
      data?.message ||
      JSON.stringify(data).slice(0, 300);
    throw new Error(
      `Mercado Pago respondeu ${response.status} ao criar cobrança PIX: ${detail}`,
    );
  }

  const payment = data?.transactions?.payments?.[0] || {};

  return {
    mpOrderId: data.id,
    status: data.status,
    statusDetail: payment.status_detail || data.status_detail || null,
    mappedStatus: mapMercadoPagoOrderStatus(data),
    pix: extractPixDataFromOrder(data),
  };
}

/**
 * Cria uma Order de Cartão (Crédito/Débito) na API /v1/orders do Mercado Pago
 * usando o token seguro gerado no frontend via Mercado Pago SDK JS / Brick.
 */
export async function createCardOrder({
  accessToken,
  order,
  store,
  card,
}) {
  const amount = Number(order.total).toFixed(2);
  const idempotencyKey = `pf-order-${order.id}-card-${crypto.randomUUID()}`;

  const payer = {
    email: resolvePayerEmail(card?.payerEmail, order.customer_phone, order.id),
  };

  const docNumber = String(card?.identification?.number || "").replace(
    /\D/g,
    "",
  );
  if (docNumber) {
    payer.identification = {
      type: card?.identification?.type || "CPF",
      number: docNumber,
    };
  }

  const paymentType =
    card?.paymentTypeId === "debit_card" ? "debit_card" : "credit_card";

  const payload = {
    type: "online",
    processing_mode: "automatic",
    capture_mode: "automatic",
    total_amount: amount,
    external_reference: String(order.id),
    description: `Pedido #${order.id} - ${store.name}`.slice(0, 250),
    payer,
    transactions: {
      payments: [
        {
          amount,
          payment_method: {
            id: String(card.paymentMethodId),
            type: paymentType,
            token: String(card.token),
            installments: Math.max(1, Number(card.installments || 1)),
          },
        },
      ],
    },
  };

  const response = await fetch(`${MP_API_BASE}/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(MP_TIMEOUT_MS),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      data?.errors?.[0]?.message ||
      data?.message ||
      JSON.stringify(data).slice(0, 300);
    throw new Error(
      `Mercado Pago respondeu ${response.status} ao processar cartão: ${detail}`,
    );
  }

  const payment = data?.transactions?.payments?.[0] || {};

  return {
    mpOrderId: data.id,
    status: data.status,
    statusDetail: payment.status_detail || data.status_detail || null,
    mappedStatus: mapMercadoPagoOrderStatus(data),
  };
}

/**
 * Consulta uma Order específica pelo ID na API /v1/orders do Mercado Pago.
 */
export async function getMercadoPagoOrder(accessToken, mpOrderId) {
  const response = await fetch(
    `${MP_API_BASE}/v1/orders/${encodeURIComponent(String(mpOrderId))}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal: AbortSignal.timeout(MP_TIMEOUT_MS),
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Mercado Pago respondeu ${response.status} ao consultar order: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}
