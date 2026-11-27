"use client";

import { useState, useEffect } from "react";

export default function MercadoPagoConnect() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [hasPublicKey, setHasPublicKey] = useState(false);
  const [hasPlatformFallback, setHasPlatformFallback] = useState(false);
  const [isSandbox, setIsSandbox] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [accessToken, setAccessToken] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadConfig() {
      try {
        const response = await fetch("/api/payments/mercadopago/config");
        if (!response.ok) return;
        const data = await response.json();
        if (ignore) return;

        setConfigured(Boolean(data.configured));
        setHasPublicKey(Boolean(data.hasPublicKey));
        setHasPlatformFallback(Boolean(data.hasPlatformFallback));
        setIsSandbox(Boolean(data.isSandbox));
      } catch {
        // Ignora erro inicial silenciosamente
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadConfig();
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSaveCredentials(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch("/api/payments/mercadopago/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          public_key: publicKey,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || "Não foi possível salvar as credenciais.");
        return;
      }

      setConfigured(true);
      setHasPublicKey(Boolean(data.hasPublicKey));
      setIsSandbox(Boolean(data.isSandbox));
      setAccountInfo(data.account || null);
      setAccessToken("");
      setPublicKey("");
      setShowForm(false);
      setSuccess(
        data.account?.nickname
          ? `Mercado Pago conectado (${data.account.nickname})!`
          : "Mercado Pago conectado com sucesso!",
      );
      setTimeout(() => setSuccess(""), 4500);
    } catch {
      setError("Erro de conexão ao validar as credenciais.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (
      !window.confirm(
        "Deseja desconectar o Mercado Pago desta loja? O pagamento online será desativado no cardápio.",
      )
    ) {
      return;
    }

    setDisconnecting(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/payments/mercadopago/config", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || "Não foi possível desconectar.");
        return;
      }

      setConfigured(false);
      setHasPublicKey(false);
      setIsSandbox(false);
      setAccountInfo(null);
      setShowForm(false);
    } catch {
      setError("Erro de conexão ao desconectar.");
    } finally {
      setDisconnecting(false);
    }
  }

  const isActive = configured || hasPlatformFallback;

  return (
    <section className="bg-white rounded-3xl shadow-2xs p-5 sm:p-6 border border-stone-200/80">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-zinc-900">
              Pagamento Online no Site (API Orders)
            </h2>
            {!loading && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  configured
                    ? isSandbox
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : hasPlatformFallback
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    configured
                      ? isSandbox
                        ? "bg-blue-500"
                        : "bg-emerald-500 animate-pulse"
                      : hasPlatformFallback
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                  }`}
                />
                {configured
                  ? isSandbox
                    ? "Ativo (Modo Teste)"
                    : "Ativo"
                  : hasPlatformFallback
                    ? "Ativo (Padrão)"
                    : "Não configurado"}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Checkout transparente via Mercado Pago Orders — PIX e Cartão sem
            sair do seu site
          </p>
        </div>

        {!loading && !showForm && (
          <div className="flex items-center gap-2">
            {configured ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setError("");
                    setShowForm(true);
                  }}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200/80 text-zinc-800 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer"
                >
                  Alterar Credenciais
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-zinc-700 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
                >
                  {disconnecting ? "Removendo..." : "Desconectar"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setShowForm(true);
                }}
                className="px-4 py-2 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                Configurar Mercado Pago
              </button>
            )}
          </div>
        )}
      </div>

      {success && (
        <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-4 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 text-xs text-zinc-500 font-medium">
          Verificando configuração de pagamento online...
        </div>
      ) : showForm ? (
        <form
          onSubmit={handleSaveCredentials}
          className="space-y-4 p-4 sm:p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80"
        >
          <ol className="text-xs sm:text-sm text-zinc-600 space-y-1.5">
            <li>
              <strong className="text-zinc-900">1.</strong> Acesse{" "}
              <a
                href="https://www.mercadopago.com.br/developers/panel/app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#BC0202] font-bold underline hover:text-[#830000]"
              >
                Mercado Pago Developers
              </a>{" "}
              e crie uma aplicação do tipo <strong>Checkout Transparente</strong>{" "}
              (API <strong>Orders</strong>).
            </li>
            <li>
              <strong className="text-zinc-900">2.</strong> Vá em{" "}
              <strong>Credenciais de produção</strong> (ou{" "}
              <strong>Credenciais de teste</strong> para testar) e copie o{" "}
              <strong>Access Token</strong> e a <strong>Public Key</strong>.
            </li>
            <li>
              <strong className="text-zinc-900">3.</strong> O{" "}
              <strong>Access Token</strong> ativa o PIX no site; a{" "}
              <strong>Public Key</strong> ativa também o pagamento por Cartão no
              site.
            </li>
          </ol>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
              Access Token (obrigatório — PIX e Orders)
            </label>
            <input
              type="password"
              required
              autoComplete="off"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="APP_USR-... ou TEST-..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
              Public Key (recomendado — habilita Cartão no site)
            </label>
            <input
              type="text"
              autoComplete="off"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="APP_USR-... ou TEST-..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setAccessToken("");
                setPublicKey("");
                setError("");
              }}
              disabled={saving}
              className="px-4 py-2 bg-white hover:bg-stone-100 text-zinc-700 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {saving ? "Validando..." : "Validar e Salvar"}
            </button>
          </div>
        </form>
      ) : isActive ? (
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs sm:text-sm text-emerald-900 space-y-1.5">
          <p>
            {configured ? (
              <>
                Pagamento transparente ativado
                {accountInfo?.nickname ? ` (${accountInfo.nickname})` : ""}.
                Seus clientes já podem pagar por{" "}
                <strong>{hasPublicKey ? "PIX e Cartão" : "PIX"}</strong> direto
                no seu site, sem redirecionamento.
              </>
            ) : (
              <>
                Usando as credenciais Mercado Pago padrão do servidor (
                <strong>{hasPublicKey ? "PIX e Cartão" : "PIX"}</strong> direto
                no site). Você também pode conectar a conta própria da sua loja
                clicando em <strong>Configurar Mercado Pago</strong>.
              </>
            )}
          </p>
          {!hasPublicKey && (
            <p className="text-xs text-amber-800 font-medium">
              Dica: adicione também sua <strong>Public Key</strong> em{" "}
              <em>Alterar Credenciais</em> para liberar pagamento por Cartão no
              site.
            </p>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-xs sm:text-sm text-amber-950">
          Ative o pagamento transparente com sua conta Mercado Pago para aceitar{" "}
          <strong>PIX e Cartão direto pelo site</strong> com confirmação
          automática. Enquanto isso, seus clientes continuam podendo pagar na
          entrega ou retirada.
        </div>
      )}
    </section>
  );
}
