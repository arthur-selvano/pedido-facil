"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const MP_SDK_SRC = "https://sdk.mercadopago.com/js/v2";

let mpSdkPromise = null;

function loadMercadoPagoSdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window indisponível."));
  }
  if (window.MercadoPago) {
    return Promise.resolve(window.MercadoPago);
  }
  if (mpSdkPromise) {
    return mpSdkPromise;
  }

  mpSdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${MP_SDK_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.MercadoPago));
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar SDK do Mercado Pago.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.src = MP_SDK_SRC;
    script.async = true;
    script.onload = () => {
      if (window.MercadoPago) {
        resolve(window.MercadoPago);
      } else {
        reject(new Error("SDK do Mercado Pago não inicializou corretamente."));
      }
    };
    script.onerror = () =>
      reject(new Error("Falha ao carregar o SDK do Mercado Pago."));
    document.head.appendChild(script);
  });

  return mpSdkPromise;
}

function formatMoney(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

function translateStatusDetail(detail) {
  const messages = {
    cc_rejected_insufficient_amount:
      "Saldo ou limite insuficiente no cartão. Tente outro cartão ou pague com PIX.",
    cc_rejected_bad_filled_card_number:
      "Número do cartão inválido. Confira os dígitos e tente novamente.",
    cc_rejected_bad_filled_date:
      "Data de validade incorreta. Confira e tente novamente.",
    cc_rejected_bad_filled_security_code:
      "Código de segurança (CVV) inválido. Confira e tente novamente.",
    cc_rejected_bad_filled_other:
      "Algum dado do cartão está incorreto. Revise e tente novamente.",
    cc_rejected_call_for_authorize:
      "Pagamento não autorizado pelo banco emissor. Autorize no app do banco ou use outro meio.",
    cc_rejected_high_risk:
      "Pagamento recusado por segurança. Tente pagar via PIX ou com outro cartão.",
    cc_rejected_duplicated_payment:
      "Pagamento duplicado detectado. Aguarde alguns instantes antes de tentar novamente.",
    cc_rejected_card_disabled:
      "Este cartão não está habilitado para compras online.",
    cc_rejected_max_attempts:
      "Limite de tentativas excedido neste cartão. Tente outro cartão ou PIX.",
  };

  return (
    messages[detail] ||
    "O pagamento com cartão não foi aprovado. Você pode tentar novamente ou pagar via PIX."
  );
}

export default function OnlinePaymentModal({
  order,
  storeName,
  mpPublicKey,
  onPaid,
  onClose,
}) {
  const hasCardOption = Boolean(mpPublicKey);
  const [activeTab, setActiveTab] = useState("pix");
  const [paymentStatus, setPaymentStatus] = useState("idle"); // idle | loading | pending | paid | failed
  const [error, setError] = useState("");

  // Estado PIX
  const [pixData, setPixData] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);

  // Estado Cartão (Brick)
  const [brickLoading, setBrickLoading] = useState(false);
  const [brickKey, setBrickKey] = useState(0);
  const brickControllerRef = useRef(null);
  const pixRequestedRef = useRef(false);

  const generatePix = useCallback(async () => {
    setError("");
    setPaymentStatus("loading");

    try {
      const response = await fetch("/api/payments/mercadopago/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.id,
          payment_token: order.payment_token,
          method: "pix",
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Não foi possível gerar o código PIX.");
        setPaymentStatus("failed");
        return;
      }

      if (data.payment_status === "paid") {
        setPaymentStatus("paid");
        onPaid?.(order.id);
        return;
      }

      setPixData(data.pix || null);
      setPaymentStatus("pending");
    } catch {
      setError("Erro de conexão ao gerar o PIX. Tente novamente.");
      setPaymentStatus("failed");
    }
  }, [order.id, order.payment_token, onPaid]);

  // Gera o PIX automaticamente na primeira abertura na aba PIX
  useEffect(() => {
    if (activeTab === "pix" && !pixData && !pixRequestedRef.current && paymentStatus !== "paid") {
      pixRequestedRef.current = true;
      generatePix();
    }
  }, [activeTab, pixData, paymentStatus, generatePix]);

  const checkStatus = useCallback(
    async (manual = false) => {
      if (manual) setChecking(true);
      try {
        const res = await fetch(
          `/api/payments/mercadopago/status?order_id=${encodeURIComponent(order.id)}&token=${encodeURIComponent(order.payment_token || "")}`,
        );
        if (!res.ok) return;
        const data = await res.json();

        if (data.payment_status === "paid") {
          setPaymentStatus("paid");
          onPaid?.(order.id);
        } else if (data.payment_status === "failed") {
          setPaymentStatus("failed");
          setError("O pagamento expirou ou foi cancelado. Gere um novo PIX ou tente outro meio.");
        }
      } catch {
        // Silencioso no polling automático
      } finally {
        if (manual) setChecking(false);
      }
    },
    [order.id, order.payment_token, onPaid],
  );

  // Polling automático a cada 4 segundos enquanto aguarda confirmação do PIX
  useEffect(() => {
    if (activeTab !== "pix" || paymentStatus !== "pending") return;

    const interval = setInterval(() => {
      checkStatus(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, paymentStatus, checkStatus]);

  // Monta o Card Payment Brick do Mercado Pago na aba Cartão
  useEffect(() => {
    if (activeTab !== "card" || !mpPublicKey || paymentStatus === "paid") {
      return;
    }

    let cancelled = false;
    setBrickLoading(true);
    setError("");

    async function mountCardBrick() {
      try {
        const MercadoPago = await loadMercadoPagoSdk();
        if (cancelled) return;

        const container = document.getElementById("mp-card-payment-brick");
        if (!container) return;
        container.innerHTML = "";

        const mp = new MercadoPago(mpPublicKey, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        const controller = await bricksBuilder.create(
          "cardPayment",
          "mp-card-payment-brick",
          {
            initialization: {
              amount: Number(order.total),
            },
            customization: {
              visual: {
                hideFormTitle: true,
                style: {
                  theme: "default",
                },
              },
              paymentMethods: {
                maxInstallments: 6,
              },
            },
            callbacks: {
              onReady: () => {
                if (!cancelled) setBrickLoading(false);
              },
              onSubmit: (formData) => {
                setError("");
                return new Promise((resolve, reject) => {
                  fetch("/api/payments/mercadopago/orders", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      order_id: order.id,
                      payment_token: order.payment_token,
                      method: "card",
                      card: {
                        token: formData.token,
                        payment_method_id: formData.payment_method_id,
                        payment_type_id: formData.payment_type_id,
                        installments: formData.installments,
                        payer_email: formData.payer?.email,
                        identification: formData.payer?.identification,
                      },
                    }),
                  })
                    .then(async (res) => {
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        throw new Error(
                          data.error || "Não foi possível processar o cartão.",
                        );
                      }

                      if (data.payment_status === "paid") {
                        setPaymentStatus("paid");
                        onPaid?.(order.id);
                        resolve();
                        return;
                      }

                      if (data.payment_status === "pending") {
                        setPaymentStatus("pending");
                        setError(
                          "Pagamento em análise pelo banco. Assim que aprovado, avisaremos no seu WhatsApp.",
                        );
                        resolve();
                        return;
                      }

                      setError(translateStatusDetail(data.status_detail));
                      setBrickKey((prev) => prev + 1);
                      resolve();
                    })
                    .catch((err) => {
                      setError(
                        err?.message ||
                          "Erro ao processar pagamento com cartão.",
                      );
                      reject(err);
                    });
                });
              },
              onError: (brickError) => {
                console.error("[mercadopago] Erro no Card Brick:", brickError);
                if (!cancelled) {
                  setBrickLoading(false);
                  setError(
                    "Não foi possível carregar o formulário de cartão. Verifique a Public Key ou pague via PIX.",
                  );
                }
              },
            },
          },
        );

        if (cancelled) {
          controller?.unmount?.();
        } else {
          brickControllerRef.current = controller;
        }
      } catch (err) {
        if (!cancelled) {
          setBrickLoading(false);
          setError(
            err?.message || "Erro ao inicializar o pagamento por cartão.",
          );
        }
      }
    }

    mountCardBrick();

    return () => {
      cancelled = true;
      if (brickControllerRef.current) {
        try {
          brickControllerRef.current.unmount();
        } catch {
          // Ignora erro de unmount
        }
        brickControllerRef.current = null;
      }
    };
  }, [activeTab, mpPublicKey, order.id, order.total, paymentStatus, brickKey, onPaid]);

  async function handleCopyPix() {
    if (!pixData?.qrCode) return;
    try {
      await navigator.clipboard.writeText(pixData.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback silencioso
    }
  }

  return (
    <div className="fixed inset-0 bg-zinc-950/65 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
          <div>
            <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase tracking-wide mb-1">
              Pagamento Seguro no Site
            </span>
            <h2 className="text-lg font-black text-zinc-900">
              Pedido #{order.id} • R$ {formatMoney(order.total)}
            </h2>
            <p className="text-xs text-zinc-500">{storeName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar pagamento"
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-zinc-600 font-bold text-sm flex items-center justify-center cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Estado Pago */}
        {paymentStatus === "paid" ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl font-black">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-black text-zinc-900">
                Pagamento aprovado!
              </h3>
              <p className="text-sm text-zinc-600 mt-1">
                Seu pedido <strong>#{order.id}</strong> foi confirmado e enviado
                para a cozinha da <strong>{storeName}</strong>. Você receberá as
                atualizações no seu WhatsApp.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-sm"
            >
              Voltar ao cardápio
            </button>
          </div>
        ) : (
          <>
            {/* Seletor PIX / Cartão */}
            {hasCardOption && (
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200/80 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setActiveTab("pix");
                  }}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                    activeTab === "pix"
                      ? "bg-white text-[#BC0202] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  PIX (Instantâneo)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setActiveTab("card");
                  }}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                    activeTab === "card"
                      ? "bg-white text-[#BC0202] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Cartão de Crédito/Débito
                </button>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Aba PIX */}
            {activeTab === "pix" && (
              <div className="space-y-4">
                {paymentStatus === "loading" ? (
                  <div className="py-10 text-center space-y-2">
                    <div className="w-8 h-8 mx-auto border-3 border-stone-200 border-t-[#BC0202] rounded-full animate-spin" />
                    <p className="text-xs font-semibold text-zinc-500">
                      Gerando QR Code PIX...
                    </p>
                  </div>
                ) : pixData ? (
                  <>
                    <div className="bg-[#F8F7F5] border border-stone-200/80 rounded-2xl p-4 text-center space-y-3">
                      <p className="text-xs font-semibold text-zinc-600">
                        Escaneie o QR Code no app do seu banco ou copie o código
                        abaixo:
                      </p>

                      {pixData.qrCodeBase64 && (
                        <div className="inline-block bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
                          <img
                            src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                            alt="QR Code PIX"
                            className="w-48 h-48 sm:w-52 sm:h-52 object-contain"
                          />
                        </div>
                      )}

                      {pixData.qrCode && (
                        <div className="space-y-2 text-left">
                          <div className="p-2.5 bg-white border border-stone-200 rounded-xl text-[11px] font-mono text-zinc-600 break-all max-h-20 overflow-y-auto select-all">
                            {pixData.qrCode}
                          </div>
                          <button
                            type="button"
                            onClick={handleCopyPix}
                            className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer"
                          >
                            {copied
                              ? "✓ Código PIX copiado!"
                              : "Copiar código PIX (Copia e Cola)"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                      <span className="flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                        Aguardando pagamento... confirmamos automaticamente.
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={checking}
                      onClick={() => checkStatus(true)}
                      className="w-full py-2.5 bg-stone-100 hover:bg-stone-200/80 disabled:opacity-50 text-zinc-800 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer"
                    >
                      {checking
                        ? "Verificando pagamento..."
                        : "Já paguei, verificar agora"}
                    </button>
                  </>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <p className="text-xs text-zinc-500">
                      Não foi possível exibir o QR Code PIX.
                    </p>
                    <button
                      type="button"
                      onClick={generatePix}
                      className="px-4 py-2.5 bg-gradient-to-b from-[#CF0606] to-[#A80000] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Tentar gerar PIX novamente
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Aba Cartão */}
            {activeTab === "card" && hasCardOption && (
              <div className="space-y-3">
                {brickLoading && (
                  <div className="py-8 text-center space-y-2">
                    <div className="w-8 h-8 mx-auto border-3 border-stone-200 border-t-[#BC0202] rounded-full animate-spin" />
                    <p className="text-xs font-semibold text-zinc-500">
                      Carregando formulário seguro de cartão...
                    </p>
                  </div>
                )}
                <div
                  id="mp-card-payment-brick"
                  key={brickKey}
                  className={brickLoading ? "hidden" : ""}
                />
              </div>
            )}

            <p className="text-[11px] text-center text-zinc-400 mt-4">
              Processado com segurança via Mercado Pago • Seus dados ficam
              protegidos
            </p>
          </>
        )}
      </div>
    </div>
  );
}
