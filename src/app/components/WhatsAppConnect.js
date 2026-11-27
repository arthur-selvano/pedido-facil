"use client";

import { useState, useEffect, useCallback } from "react";

const POLL_INTERVAL_MS = 3000;

export default function WhatsAppConnect({
  mode = "card",
  storeName = "",
  onFinish,
}) {
  const isOnboarding = mode === "onboarding";

  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [connected, setConnected] = useState(false);
  const [qrcode, setQrcode] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showQrPanel, setShowQrPanel] = useState(isOnboarding);
  const [error, setError] = useState("");

  const requestQrCode = useCallback(async () => {
    setGenerating(true);
    setError("");
    setShowQrPanel(true);

    try {
      const response = await fetch("/api/whatsapp", { method: "POST" });
      const data = await response.json().catch(() => ({}));

      if (response.status === 503) {
        setConfigured(false);
        if (isOnboarding && onFinish) {
          onFinish();
        }
        return;
      }

      if (!response.ok) {
        setError(
          data.error ||
            "Não foi possível gerar o QR Code. Tente novamente em instantes.",
        );
        return;
      }

      if (data.connected) {
        setConnected(true);
        setQrcode(null);
        return;
      }

      if (data.qrcode) {
        setQrcode(data.qrcode);
      } else {
        setError(
          "O QR Code ainda está sendo preparado. Clique em \"Gerar novo QR Code\" em alguns segundos.",
        );
      }
    } catch {
      setError("Erro de conexão ao tentar gerar o QR Code.");
    } finally {
      setGenerating(false);
      setLoading(false);
    }
  }, [isOnboarding, onFinish]);

  // Carga inicial: no onboarding já gera o QR automaticamente; no painel apenas consulta o status.
  useEffect(() => {
    let ignore = false;

    async function init() {
      if (isOnboarding) {
        await requestQrCode();
        return;
      }

      try {
        const response = await fetch("/api/whatsapp");
        const data = await response.json().catch(() => ({}));
        if (ignore) return;

        if (data.configured === false) {
          setConfigured(false);
        } else {
          setConfigured(true);
          setConnected(Boolean(data.connected));
          if (data.state === "error" && data.error) {
            setError(data.error);
          }
        }
      } catch {
        if (!ignore) {
          setError("Não foi possível verificar o status do WhatsApp.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, [isOnboarding, requestQrCode]);

  // Enquanto o QR Code estiver na tela aguardando leitura, verifica a conexão a cada 3s.
  useEffect(() => {
    if (!showQrPanel || connected || !qrcode) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch("/api/whatsapp");
        if (!response.ok) return;
        const data = await response.json();
        if (data.connected) {
          setConnected(true);
          setQrcode(null);
          setError("");
        }
      } catch {
        // Ignora erro transitório de polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [showQrPanel, connected, qrcode]);

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Deseja desconectar o WhatsApp desta loja? As notificações automáticas ficarão pausadas até você conectar novamente.",
      )
    ) {
      return;
    }

    setDisconnecting(true);
    setError("");

    try {
      const response = await fetch("/api/whatsapp", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Não foi possível desconectar o WhatsApp.");
        return;
      }

      setConnected(false);
      setQrcode(null);
      setShowQrPanel(false);
    } catch {
      setError("Erro de conexão ao desconectar o WhatsApp.");
    } finally {
      setDisconnecting(false);
    }
  }

  if (!configured) {
    return null;
  }

  // Modo Onboarding (Passo 2 logo após criar a loja)
  if (isOnboarding) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-[#F8F7F5] px-4 py-10 overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(188,2,2,0.08),transparent_55%)]"
        />

        <div className="relative w-full max-w-lg bg-white rounded-3xl border border-stone-200/80 shadow-xl shadow-zinc-900/5 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#BC0202] to-[#830000]" />

          <div className="p-6 sm:p-8">
            <div className="flex justify-center items-center mb-4">
              <img
                src="/logo.png"
                alt="Logo Pedido Fácil"
                className="h-14 sm:h-16 w-auto object-contain mix-blend-multiply"
              />
            </div>

            <div className="text-center mb-6 space-y-1.5">
              <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-1">
                Passo 2 de 2 · Loja criada!
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                Conecte seu WhatsApp
              </h1>
              <p className="text-sm text-zinc-500">
                {storeName ? (
                  <>
                    Avise os clientes da{" "}
                    <strong className="text-zinc-800">{storeName}</strong>{" "}
                    automaticamente no WhatsApp a cada etapa do pedido.
                  </>
                ) : (
                  "Avise seus clientes automaticamente no WhatsApp a cada etapa do pedido."
                )}
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            {connected ? (
              <div className="space-y-5">
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center text-2xl font-black">
                    ✓
                  </div>
                  <h2 className="text-lg font-black text-emerald-950">
                    WhatsApp conectado com sucesso!
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-800">
                    Tudo pronto. A partir de agora seus clientes recebem
                    atualizações automáticas quando fazem um pedido e a cada
                    mudança de status.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onFinish}
                  className="w-full py-3 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-sm font-bold rounded-xl transition shadow-md shadow-[#BC0202]/20 cursor-pointer"
                >
                  Ir para o Painel da Loja
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-col items-center justify-center p-5 bg-[#F8F7F5] rounded-2xl border border-stone-200/80 min-h-[250px]">
                  {generating || loading ? (
                    <div className="flex flex-col items-center gap-3 text-zinc-500 text-sm font-semibold">
                      <span className="w-3 h-3 rounded-full bg-[#BC0202] animate-ping" />
                      Gerando QR Code...
                    </div>
                  ) : qrcode ? (
                    <div className="space-y-3 text-center">
                      <div className="p-3 bg-white rounded-2xl border border-stone-200 shadow-xs inline-block">
                        <img
                          src={qrcode}
                          alt="QR Code para conectar o WhatsApp"
                          className="w-52 h-52 object-contain"
                        />
                      </div>
                      <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Aguardando leitura do QR Code...
                      </p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={requestQrCode}
                      className="px-5 py-2.5 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-xs"
                    >
                      Gerar QR Code
                    </button>
                  )}
                </div>

                <ol className="text-xs sm:text-sm text-zinc-600 space-y-2 bg-stone-50/80 p-4 rounded-2xl border border-stone-200/70">
                  <li>
                    <strong className="text-zinc-900">1.</strong> Abra o{" "}
                    <strong>WhatsApp</strong> no celular da loja.
                  </li>
                  <li>
                    <strong className="text-zinc-900">2.</strong> Toque em{" "}
                    <strong>Mais opções (⋮)</strong> ou{" "}
                    <strong>Configurações</strong> →{" "}
                    <strong>Aparelhos conectados</strong>.
                  </li>
                  <li>
                    <strong className="text-zinc-900">3.</strong> Toque em{" "}
                    <strong>Conectar aparelho</strong> e aponte a câmera para o
                    código acima.
                  </li>
                </ol>

                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={requestQrCode}
                    disabled={generating}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200/80 disabled:opacity-50 text-zinc-800 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer"
                  >
                    {generating ? "Gerando..." : "Gerar novo QR Code"}
                  </button>
                  <button
                    type="button"
                    onClick={onFinish}
                    className="w-full sm:flex-1 py-2.5 px-4 bg-white hover:bg-stone-50 text-zinc-600 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer"
                  >
                    Pular por enquanto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Modo Card no Painel Administrativo (/dashboard)
  return (
    <section className="bg-white rounded-3xl shadow-2xs p-5 sm:p-6 border border-stone-200/80">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-zinc-900">
              WhatsApp Automático
            </h2>
            {!loading && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  connected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : showQrPanel && qrcode
                      ? "bg-orange-50 text-orange-700 border-orange-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connected
                      ? "bg-emerald-500 animate-pulse"
                      : showQrPanel && qrcode
                        ? "bg-orange-500 animate-pulse"
                        : "bg-amber-500"
                  }`}
                />
                {connected
                  ? "Conectado"
                  : showQrPanel && qrcode
                    ? "Aguardando leitura"
                    : "Não conectado"}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Envia mensagens automáticas para o cliente na criação do pedido e a
            cada mudança de status
          </p>
        </div>

        {!loading && (
          <div className="flex items-center gap-2">
            {connected ? (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="px-3.5 py-2 bg-stone-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-zinc-700 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
              >
                {disconnecting ? "Desconectando..." : "Desconectar"}
              </button>
            ) : !showQrPanel ? (
              <button
                type="button"
                onClick={requestQrCode}
                disabled={generating}
                className="px-4 py-2 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                {generating ? "Gerando QR Code..." : "Conectar WhatsApp"}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-4 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 text-xs text-zinc-500 font-medium">
          Verificando conexão do WhatsApp...
        </div>
      ) : connected ? (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs sm:text-sm text-emerald-900">
          Seu WhatsApp está conectado. Os clientes recebem confirmação ao fazer
          o pedido e avisos automáticos quando o pedido entra em preparo, sai
          para entrega, é concluído ou cancelado.
        </div>
      ) : showQrPanel ? (
        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-5 items-center p-4 sm:p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80">
          <div className="flex flex-col items-center justify-center min-w-[208px] min-h-[208px]">
            {generating ? (
              <div className="flex flex-col items-center gap-2.5 text-zinc-500 text-xs font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#BC0202] animate-ping" />
                Gerando QR Code...
              </div>
            ) : qrcode ? (
              <div className="p-2.5 bg-white rounded-2xl border border-stone-200 shadow-xs">
                <img
                  src={qrcode}
                  alt="QR Code para conectar o WhatsApp"
                  className="w-48 h-48 object-contain"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={requestQrCode}
                className="px-4 py-2 bg-gradient-to-b from-[#CF0606] to-[#A80000] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Tentar novamente
              </button>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-black text-zinc-900">
              Escaneie o QR Code com o WhatsApp da loja
            </h3>
            <ol className="text-xs sm:text-sm text-zinc-600 space-y-1.5">
              <li>
                <strong className="text-zinc-900">1.</strong> Abra o{" "}
                <strong>WhatsApp</strong> no celular da loja.
              </li>
              <li>
                <strong className="text-zinc-900">2.</strong> Acesse{" "}
                <strong>Aparelhos conectados</strong> (menu ⋮ ou Configurações).
              </li>
              <li>
                <strong className="text-zinc-900">3.</strong> Toque em{" "}
                <strong>Conectar aparelho</strong> e aponte a câmera para o
                código.
              </li>
            </ol>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={requestQrCode}
                disabled={generating}
                className="px-3.5 py-2 bg-white hover:bg-stone-100 disabled:opacity-50 text-zinc-800 text-xs font-bold rounded-xl border border-stone-300 transition cursor-pointer"
              >
                {generating ? "Atualizando..." : "Gerar novo QR Code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowQrPanel(false);
                  setQrcode(null);
                  setError("");
                }}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200/80 text-zinc-600 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-amber-950">
          Conecte o WhatsApp da sua loja em poucos segundos escaneando um QR
          Code para avisar seus clientes automaticamente a cada etapa do pedido.
        </div>
      )}
    </section>
  );
}
