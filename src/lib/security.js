import crypto from "node:crypto";
import { NextResponse } from "next/server";

const ENCRYPTION_PREFIX = "enc:v1:";
const RATE_LIMIT_BUCKETS = new Map();
const MAX_BUCKET_ENTRIES = 5000;

function getMasterSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === "") {
    throw new Error("A variável de ambiente JWT_SECRET não está definida.");
  }
  return secret;
}

function getEncryptionKey() {
  const raw = process.env.ENCRYPTION_KEY?.trim() || getMasterSecret();
  return crypto.createHash("sha256").update(raw).digest();
}

/**
 * Criptografa um segredo com AES-256-GCM antes de gravar no banco.
 */
export function encryptSecret(plaintext) {
  if (typeof plaintext !== "string" || plaintext.length === 0) {
    return null;
  }
  if (plaintext.startsWith(ENCRYPTION_PREFIX)) {
    return plaintext;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${encrypted.toString("base64url")}`;
}

/**
 * Descriptografa segredo salvo no banco. Mantém compatibilidade com registros
 * antigos salvos em texto puro antes da ativação da criptografia.
 */
export function decryptSecret(storedValue) {
  if (typeof storedValue !== "string" || storedValue.trim() === "") {
    return null;
  }

  const trimmed = storedValue.trim();
  if (!trimmed.startsWith(ENCRYPTION_PREFIX)) {
    return trimmed;
  }

  try {
    const payload = trimmed.slice(ENCRYPTION_PREFIX.length);
    const [ivB64, tagB64, dataB64] = payload.split(":");
    if (!ivB64 || !tagB64 || !dataB64) return null;

    const key = getEncryptionKey();
    const iv = Buffer.from(ivB64, "base64url");
    const tag = Buffer.from(tagB64, "base64url");
    const encrypted = Buffer.from(dataB64, "base64url");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  } catch (err) {
    console.error("[security] Falha ao descriptografar segredo:", err);
    return null;
  }
}

/**
 * Gera um token HMAC-SHA256 vinculado ao ID do pedido para autorizar
 * operações públicas de pagamento sem permitir enumeração (IDOR).
 */
export function signOrderAccessToken(orderId) {
  const idStr = String(orderId);
  return crypto
    .createHmac("sha256", getMasterSecret())
    .update(`order-payment:${idStr}`)
    .digest("base64url");
}

export function verifyOrderAccessToken(orderId, token) {
  if (!orderId || typeof token !== "string" || token.trim() === "") {
    return false;
  }

  const expected = signOrderAccessToken(orderId);
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(token.trim(), "utf8");

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Valida assinatura x-signature enviada pelo Mercado Pago em Webhooks.
 * Se MERCADOPAGO_WEBHOOK_SECRET não estiver configurado, retorna { valid: true, skipped: true }
 * para manter compatibilidade (o webhook já valida o status diretamente na API do MP).
 */
export function verifyMercadoPagoWebhookSignature(request, dataId) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return { valid: true, skipped: true };
  }

  const xSignature = request.headers.get("x-signature") || "";
  const xRequestId = request.headers.get("x-request-id") || "";

  if (!xSignature) {
    return { valid: false, reason: "missing_signature" };
  }

  let ts = "";
  let v1 = "";
  for (const part of xSignature.split(",")) {
    const [k, v] = part.split("=").map((s) => s?.trim());
    if (k === "ts" && v) ts = v;
    if (k === "v1" && v) v1 = v;
  }

  if (!ts || !v1) {
    return { valid: false, reason: "malformed_signature" };
  }

  const manifestParts = [];
  if (dataId) manifestParts.push(`id:${String(dataId).toLowerCase()}`);
  if (xRequestId) manifestParts.push(`request-id:${xRequestId}`);
  manifestParts.push(`ts:${ts}`);
  const manifest = `${manifestParts.join(";")};`;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(v1.toLowerCase(), "utf8");

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { valid: false, reason: "invalid_hmac" };
  }

  return { valid: true, skipped: false };
}

/**
 * Extrai IP do cliente respeitando proxies reversos (Vercel, Nginx, Cloudflare).
 */
export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "unknown";
}

/**
 * Rate limiter em memória com janela deslizante por IP + chave de rota.
 */
export function checkRateLimit(
  request,
  { key, limit = 20, windowMs = 60_000 },
) {
  const now = Date.now();
  const ip = getClientIp(request);
  const bucketKey = `${key}:${ip}`;

  if (RATE_LIMIT_BUCKETS.size > MAX_BUCKET_ENTRIES) {
    for (const [k, entry] of RATE_LIMIT_BUCKETS.entries()) {
      if (entry.resetAt <= now) {
        RATE_LIMIT_BUCKETS.delete(k);
      }
    }
  }

  const current = RATE_LIMIT_BUCKETS.get(bucketKey);
  if (!current || current.resetAt <= now) {
    RATE_LIMIT_BUCKETS.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (current.count >= limit) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((current.resetAt - now) / 1000),
    );
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - current.count),
    retryAfterSeconds: 0,
  };
}

export function rateLimitResponse(retryAfterSeconds) {
  return NextResponse.json(
    {
      error:
        "Muitas requisições em pouco tempo. Aguarde alguns instantes e tente novamente.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  return (
    trimmed.length >= 5 &&
    trimmed.length <= 150 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  );
}

export function isValidHttpUrl(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
