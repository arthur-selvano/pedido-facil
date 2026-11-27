/**
 * Integração com Mercado Pago Checkout Pro (PIX e Cartão online).
 *
 * Cada loja pode configurar seu próprio Access Token no painel (/dashboard),
 * salvo em `stores.mp_access_token`. Opcionalmente, `MERCADOPAGO_ACCESS_TOKEN`
 * no `.env` funciona como fallback global da plataforma.
 */

const MP_API_BASE = "https://api.mercadopago.com";
const MP_TIMEOUT_MS = 15000;

export function resolveMercadoPagoToken(store) {
  const storeToken = store?.mp_access_token?.trim();
  if (storeToken) return storeToken;

  const fallbackToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  return fallbackToken || null;
}

export function hasOnlinePaymentEnabled(store) {
  return resolveMercadoPagoToken(store) !== null;
}

export function isPublicHttpsUrl(urlString) {
  if (!urlString) return false;
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      host !== "0.0.0.0" &&
      !host.endsWith(".local")
    );
  } catch {
    return false;
  }
}

export function resolveAppUrl(request) {
  const envUrl = process.env.APP_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  try {
    const url = new URL(request.url);
    return url.origin.replace(/\/+$/, "");
  } catch {
    return "http://localhost:3000";
  }
}

/**
 * Mapeia o status retornado pela API do Mercado Pago para o status interno do pedido.
 */
export function mapMercadoPagoStatus(mpStatus) {
  switch (mpStatus) {
    case "approved":
      return "paid";
    case "rejected":
    case "cancelled":
      return "failed";
    case "refunded":
    case "charged_back":
      return "refunded";
    default:
      return "pending";
  }
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
 * Cria uma preferência no Mercado Pago Checkout Pro e retorna a URL de pagamento.
 */
export async function createCheckoutPreference({
  accessToken,
  order,
  store,
  items,
  appUrl,
}) {
  const mpItems = (items || []).map((item, idx) => ({
    id: String(item.product_id || idx + 1),
    title: String(item.product_name || "Item").slice(0, 250),
    quantity: Number(item.quantity),
    currency_id: "BRL",
    unit_price: Number(Number(item.unit_price).toFixed(2)),
  }));

  const deliveryFee = Number(order.delivery_fee || 0);
  if (deliveryFee > 0) {
    mpItems.push({
      id: "delivery-fee",
      title: "Taxa de entrega",
      quantity: 1,
      currency_id: "BRL",
      unit_price: Number(deliveryFee.toFixed(2)),
    });
  }

  const baseReturnUrl = `${appUrl}/${encodeURIComponent(store.slug)}?order=${order.id}`;

  const payload = {
    items: mpItems,
    external_reference: String(order.id),
    statement_descriptor: String(store.name || "Pedido Facil")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .trim()
      .slice(0, 22),
    back_urls: {
      success: `${baseReturnUrl}&mp_status=success`,
      pending: `${baseReturnUrl}&mp_status=pending`,
      failure: `${baseReturnUrl}&mp_status=failure`,
    },
    metadata: {
      order_id: order.id,
      store_id: store.id,
    },
  };

  // Mercado Pago só aceita auto_return e notification_url em domínios HTTPS públicos.
  if (isPublicHttpsUrl(appUrl)) {
    payload.auto_return = "approved";
    payload.notification_url = `${appUrl}/api/payments/mercadopago/webhook?store_id=${store.id}`;
  }

  const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(MP_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Mercado Pago respondeu ${response.status} ao criar pagamento: ${body.slice(0, 400)}`,
    );
  }

  const data = await response.json();
  const isSandbox = accessToken.startsWith("TEST-");
  const initPoint = isSandbox
    ? data.sandbox_init_point || data.init_point
    : data.init_point;

  if (!initPoint) {
    throw new Error("Mercado Pago não retornou a URL de pagamento.");
  }

  return {
    preferenceId: data.id,
    initPoint,
  };
}

/**
 * Consulta um pagamento específico pelo ID na API do Mercado Pago.
 */
export async function getMercadoPagoPayment(accessToken, paymentId) {
  const response = await fetch(
    `${MP_API_BASE}/v1/payments/${encodeURIComponent(String(paymentId))}`,
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
      `Mercado Pago respondeu ${response.status} ao consultar pagamento: ${body.slice(0, 300)}`,
    );
  }

  return response.json();
}

/**
 * Busca o pagamento mais recente associado a um pedido (via external_reference).
 */
export async function findLatestPaymentByOrder(accessToken, orderId) {
  const url = `${MP_API_BASE}/v1/payments/search?external_reference=${encodeURIComponent(
    String(orderId),
  )}&sort=date_created&criteria=desc&limit=1`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    signal: AbortSignal.timeout(MP_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Mercado Pago respondeu ${response.status} ao buscar pagamentos: ${body.slice(0, 300)}`,
    );
  }

  const data = await response.json().catch(() => ({}));
  const results = Array.isArray(data.results) ? data.results : [];
  return results[0] || null;
}
