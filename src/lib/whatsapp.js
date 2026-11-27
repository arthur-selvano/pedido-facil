/**
 * Integração com WhatsApp via Evolution API (v2).
 *
 * Variáveis de ambiente:
 * - EVOLUTION_API_URL      URL base da Evolution API (ex.: http://localhost:8080)
 * - EVOLUTION_API_KEY      Chave global (AUTHENTICATION_API_KEY)
 * - EVOLUTION_INSTANCE     (Opcional) Instância padrão de fallback caso a loja ainda
 *                          não tenha conectado um WhatsApp próprio no painel
 *
 * Se EVOLUTION_API_URL ou EVOLUTION_API_KEY não estiverem configuradas, os envios
 * são ignorados (com aviso no log) e o fluxo de pedidos continua normalmente.
 */

const SEND_TIMEOUT_MS = 15000;
const CONNECT_RETRIES = 4;
const CONNECT_RETRY_DELAY_MS = 1500;

let warnedNotConfigured = false;

function getServerConfig() {
  const baseUrl = process.env.EVOLUTION_API_URL?.trim();
  const apiKey = process.env.EVOLUTION_API_KEY?.trim();

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

export function isWhatsAppConfigured() {
  return getServerConfig() !== null;
}

/**
 * Retorna o nome da instância exclusiva de uma loja na Evolution API.
 */
export function getStoreInstanceName(store) {
  if (store?.whatsapp_instance && store.whatsapp_instance.trim()) {
    return store.whatsapp_instance.trim();
  }
  return `loja-${store.id}`;
}

/**
 * Resolve qual instância usar para enviar notificações de uma loja:
 * prioriza a instância própria da loja e cai para EVOLUTION_INSTANCE se existir.
 */
function resolveSendInstance(store) {
  const storeInstance = store?.whatsapp_instance?.trim();
  if (storeInstance) return storeInstance;

  const fallbackInstance = process.env.EVOLUTION_INSTANCE?.trim();
  return fallbackInstance || null;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Consulta o estado atual da conexão de uma instância na Evolution API.
 */
export async function getInstanceState(instanceName) {
  const config = getServerConfig();
  if (!config) {
    return { configured: false, exists: false, state: "unconfigured" };
  }

  const url = `${config.baseUrl}/instance/connectionState/${encodeURIComponent(
    instanceName,
  )}`;

  const response = await fetch(url, {
    method: "GET",
    headers: { apikey: config.apiKey },
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    cache: "no-store",
  });

  if (response.status === 404) {
    return { configured: true, exists: false, state: "close" };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Evolution API respondeu ${response.status} ao consultar status: ${body.slice(0, 300)}`,
    );
  }

  const data = await response.json().catch(() => ({}));
  const state = data?.instance?.state || data?.state || "close";

  return { configured: true, exists: true, state };
}

/**
 * Cria (se ainda não existir) e solicita o QR Code para conectar uma instância.
 */
export async function connectInstance(instanceName) {
  const config = getServerConfig();
  if (!config) {
    throw new Error("Serviço de WhatsApp não configurado no servidor.");
  }

  const current = await getInstanceState(instanceName);
  if (current.exists && current.state === "open") {
    return { state: "open", qrcode: null, pairingCode: null };
  }

  if (!current.exists) {
    const createRes = await fetch(`${config.baseUrl}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.apiKey,
      },
      body: JSON.stringify({
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        qrcode: true,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!createRes.ok) {
      const body = await createRes.text().catch(() => "");
      throw new Error(
        `Não foi possível criar a instância do WhatsApp (${createRes.status}): ${body.slice(0, 300)}`,
      );
    }

    const created = await createRes.json().catch(() => ({}));
    const qrBase64 = created?.qrcode?.base64 || null;
    if (qrBase64) {
      return {
        state: "connecting",
        qrcode: qrBase64,
        pairingCode: created?.qrcode?.pairingCode || null,
      };
    }
  }

  // Solicita o QR Code com pequenas retentativas, pois o Baileys pode levar
  // ~1–2 segundos após a criação para emitir o primeiro QR.
  const connectUrl = `${config.baseUrl}/instance/connect/${encodeURIComponent(
    instanceName,
  )}`;

  for (let attempt = 0; attempt < CONNECT_RETRIES; attempt++) {
    if (attempt > 0) {
      await delay(CONNECT_RETRY_DELAY_MS);
    }

    const res = await fetch(connectUrl, {
      method: "GET",
      headers: { apikey: config.apiKey },
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(
        `Não foi possível gerar o QR Code (${res.status}): ${body.slice(0, 300)}`,
      );
    }

    const data = await res.json().catch(() => ({}));

    if (data?.instance?.state === "open") {
      return { state: "open", qrcode: null, pairingCode: null };
    }

    if (data?.base64) {
      return {
        state: "connecting",
        qrcode: data.base64,
        pairingCode: data.pairingCode || null,
      };
    }
  }

  return { state: "connecting", qrcode: null, pairingCode: null };
}

/**
 * Desconecta e remove a instância na Evolution API para permitir uma nova
 * conexão limpa quando o lojista quiser trocar o número.
 */
export async function disconnectInstance(instanceName) {
  const config = getServerConfig();
  if (!config) {
    return { disconnected: false };
  }

  const encoded = encodeURIComponent(instanceName);

  // Ignora erro caso já esteja desconectada
  await fetch(`${config.baseUrl}/instance/logout/${encoded}`, {
    method: "DELETE",
    headers: { apikey: config.apiKey },
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => null);

  await fetch(`${config.baseUrl}/instance/delete/${encoded}`, {
    method: "DELETE",
    headers: { apikey: config.apiKey },
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    cache: "no-store",
  }).catch(() => null);

  return { disconnected: true };
}

/**
 * Normaliza o telefone para o formato exigido pelo WhatsApp (DDI + DDD + número,
 * somente dígitos). Números sem DDI são tratados como brasileiros (55).
 * Retorna null quando o número é inválido.
 */
export function normalizeWhatsAppNumber(rawPhone) {
  if (typeof rawPhone !== "string" && typeof rawPhone !== "number") {
    return null;
  }

  const raw = String(rawPhone).trim();
  const hasInternationalPrefix = raw.startsWith("+");
  let digits = raw.replace(/\D/g, "");

  if (!digits) return null;

  if (hasInternationalPrefix) {
    return digits.length >= 10 && digits.length <= 15 ? digits : null;
  }

  // Remove zeros à esquerda (ex.: 034999999999 ou 0xx34...)
  digits = digits.replace(/^0+/, "");

  // DDD + número (fixo com 10 dígitos ou celular com 11 dígitos)
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  if (!/^55[1-9]{2}\d{8,9}$/.test(digits)) {
    return null;
  }

  return digits;
}

function formatMoney(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

function firstName(fullName) {
  return String(fullName || "").trim().split(/\s+/)[0] || "cliente";
}

function formatItems(items) {
  if (!Array.isArray(items) || items.length === 0) return "";

  return items
    .map(
      (item) =>
        `• ${item.quantity}x ${item.product_name} — R$ ${formatMoney(
          Number(item.unit_price) * Number(item.quantity),
        )}`,
    )
    .join("\n");
}

/**
 * Monta a mensagem de acordo com a etapa do pedido.
 * Retorna null quando a etapa não deve gerar notificação.
 */
export function buildOrderStatusMessage({ order, store, status, items }) {
  const name = firstName(order.customer_name);
  const storeName = store?.name || "a loja";
  const orderLabel = `*#${order.id}*`;
  const isDelivery = order.delivery_type === "delivery";

  switch (status) {
    case "pending": {
      const itemsText = formatItems(items);
      const lines = [
        `Olá, ${name}! 👋`,
        `Recebemos seu pedido ${orderLabel} na *${storeName}*.`,
      ];

      if (itemsText) {
        lines.push("", itemsText);
      }

      lines.push(
        "",
        `*Total:* R$ ${formatMoney(order.total)}`,
        `*Tipo:* ${isDelivery ? "Entrega" : "Retirada no local"}`,
      );

      if (order.payment_method === "online" && order.payment_status !== "paid") {
        lines.push("*Pagamento:* Online (aguardando confirmação)");
      }

      lines.push(
        "",
        "Você receberá por aqui uma mensagem a cada atualização do seu pedido.",
      );

      return lines.join("\n");
    }

    case "preparing":
      return [
        `👨‍🍳 Boa notícia, ${name}!`,
        `Seu pedido ${orderLabel} foi aceito pela *${storeName}* e já está sendo preparado.`,
      ].join("\n");

    case "out_for_delivery": {
      const lines = [
        `🛵 ${name}, seu pedido ${orderLabel} saiu para entrega!`,
      ];
      if (order.address) {
        lines.push(`*Endereço:* ${order.address}`);
      }
      lines.push("Fique atento, ele chegará em breve.");
      return lines.join("\n");
    }

    case "delivered":
      return [
        isDelivery
          ? `✅ Pedido ${orderLabel} entregue!`
          : `✅ Pedido ${orderLabel} retirado e concluído!`,
        `Obrigado pela preferência, ${name}. A *${storeName}* agradece e espera você novamente! 😊`,
      ].join("\n");

    case "canceled": {
      const lines = [
        `❌ ${name}, infelizmente seu pedido ${orderLabel} foi cancelado pela *${storeName}*.`,
      ];
      if (store?.phone) {
        lines.push(`Em caso de dúvidas, fale com a loja: ${store.phone}`);
      }
      return lines.join("\n");
    }

    default:
      return null;
  }
}

/**
 * Envia uma mensagem de texto pela Evolution API.
 * Lança erro em caso de falha na requisição.
 */
export async function sendWhatsAppText(number, text, instanceName) {
  const config = getServerConfig();
  const targetInstance =
    instanceName?.trim() || process.env.EVOLUTION_INSTANCE?.trim();

  if (!config || !targetInstance) {
    if (!warnedNotConfigured) {
      console.warn(
        "[whatsapp] Serviço ou instância do WhatsApp não configurados. Envio de mensagens desativado.",
      );
      warnedNotConfigured = true;
    }
    return { skipped: true };
  }

  const url = `${config.baseUrl}/message/sendText/${encodeURIComponent(
    targetInstance,
  )}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: config.apiKey,
    },
    body: JSON.stringify({ number, text }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Evolution API respondeu ${response.status}: ${body.slice(0, 500)}`,
    );
  }

  return { sent: true };
}

/**
 * Notifica o cliente sobre a etapa atual do pedido.
 * Nunca lança erro: falhas são apenas registradas no log para não afetar o pedido.
 */
export async function notifyOrderStatus({ order, store, status, items }) {
  try {
    const text = buildOrderStatusMessage({ order, store, status, items });
    if (!text) return;

    const number = normalizeWhatsAppNumber(order.customer_phone);
    if (!number) {
      console.warn(
        `[whatsapp] Pedido #${order.id}: telefone inválido (${order.customer_phone}). Mensagem não enviada.`,
      );
      return;
    }

    const instanceName = resolveSendInstance(store);
    const result = await sendWhatsAppText(number, text, instanceName);
    if (result.sent) {
      console.info(
        `[whatsapp] Pedido #${order.id}: mensagem "${status}" enviada para ${number} (instância: ${instanceName}).`,
      );
    }
  } catch (error) {
    console.error(
      `[whatsapp] Falha ao notificar pedido #${order?.id} (${status}):`,
      error,
    );
  }
}

/**
 * Notifica o cliente no WhatsApp quando o pagamento online é confirmado.
 * Nunca lança erro para não afetar o fluxo do webhook/consulta.
 */
export async function notifyPaymentConfirmed({ order, store }) {
  try {
    const number = normalizeWhatsAppNumber(order.customer_phone);
    if (!number) return;

    const name = firstName(order.customer_name);
    const storeName = store?.name || "a loja";
    const text = [
      `💳 Pagamento confirmado, ${name}!`,
      `Recebemos o pagamento de *R$ ${formatMoney(order.total)}* do seu pedido *#${order.id}* na *${storeName}*.`,
      "Assim que o pedido entrar em preparo, avisaremos por aqui.",
    ].join("\n");

    const instanceName = resolveSendInstance(store);
    const result = await sendWhatsAppText(number, text, instanceName);
    if (result.sent) {
      console.info(
        `[whatsapp] Pedido #${order.id}: confirmação de pagamento enviada para ${number}.`,
      );
    }
  } catch (error) {
    console.error(
      `[whatsapp] Falha ao notificar pagamento do pedido #${order?.id}:`,
      error,
    );
  }
}
