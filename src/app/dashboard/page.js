"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function formatPrice(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

export default function DashboardPage() {
  const router = useRouter();

  const [store, setStore] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [togglingStore, setTogglingStore] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [editingStore, setEditingStore] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDeliveryFee, setEditDeliveryFee] = useState("");
  const [savingStore, setSavingStore] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");

  // Computed client-side after load: reading the clock during render breaks
  // the Cache Components prerender of this route.
  const [todayKey, setTodayKey] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [storeRes, ordersRes] = await Promise.all([
          fetch("/api/stores"),
          fetch("/api/orders"),
        ]);

        if (storeRes.status === 401 || ordersRes.status === 401) {
          router.push("/login");
          return;
        }

        const storeData = await storeRes.json();
        setStore(storeData.store);

        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          setTodayKey(new Date().toLocaleDateString("pt-BR"));
          setOrders(ordersData.orders || []);
        }
      } catch (err) {
        console.error("Erro ao carregar painel:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [router]);

  async function handleCreateStore(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug,
          phone,
          delivery_fee: Number(deliveryFee) || 0,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao cadastrar loja.");
        setSubmitting(false);
        return;
      }

      setStore(data.store);
    } catch {
      setError("Erro de conexão com o servidor.");
      setSubmitting(false);
    }
  }

  async function handleToggleStore() {
    setTogglingStore(true);
    try {
      const response = await fetch("/api/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_open: !store.is_open }),
      });

      const data = await response.json();

      if (response.ok) {
        setStore(data.store);
      } else {
        alert(data.error || "Erro ao alterar status da loja.");
      }
    } catch {
      alert("Erro de conexão com o servidor.");
    } finally {
      setTogglingStore(false);
    }
  }

  async function handleCopyLink() {
    const publicUrl = `${window.location.origin}/${store.slug}`;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      alert(`Copie o link: ${publicUrl}`);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Erro ao sair da conta:", err);
      setLoggingOut(false);
    }
  }

  function handleStartEditStore() {
    setEditName(store.name || "");
    setEditPhone(store.phone || "");
    setEditDeliveryFee(
      store.delivery_fee !== null && store.delivery_fee !== undefined
        ? Number(store.delivery_fee).toFixed(2)
        : "0.00",
    );
    setEditError("");
    setEditSuccess("");
    setEditingStore(true);
  }

  function handleCancelEditStore() {
    setEditError("");
    setEditingStore(false);
  }

  async function handleUpdateStore(e) {
    e.preventDefault();
    setEditError("");
    setEditSuccess("");
    setSavingStore(true);

    try {
      const response = await fetch("/api/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          phone: editPhone,
          delivery_fee: editDeliveryFee === "" ? 0 : Number(editDeliveryFee),
        }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setEditError(data.error || "Erro ao atualizar dados da loja.");
        return;
      }

      setStore(data.store);
      setEditingStore(false);
      setEditSuccess("Dados da loja atualizados com sucesso!");
      setTimeout(() => setEditSuccess(""), 3500);
    } catch (err) {
      console.error("Erro ao salvar dados da loja:", err);
      setEditError("Erro de conexão com o servidor.");
    } finally {
      setSavingStore(false);
    }
  }

  const todayDeliveredOrders = orders.filter((order) => {
    if (order.status !== "delivered" || !order.created_at) return false;
    const orderDay = new Date(order.created_at).toLocaleDateString("pt-BR");
    return orderDay === todayKey;
  });

  const todayRevenue = todayDeliveredOrders.reduce(
    (acc, order) => acc + Number(order.total || 0),
    0,
  );

  const todayCount = todayDeliveredOrders.length;
  const averageTicket = todayCount > 0 ? todayRevenue / todayCount : 0;

  const activeQueueCount = orders.filter((o) =>
    ["pending", "preparing", "out_for_delivery"].includes(o.status),
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5]">
        <div className="flex items-center gap-3 text-zinc-600 font-semibold text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BC0202] animate-ping" />
          Carregando painel...
        </div>
      </div>
    );
  }

  if (!store) {
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
                className="h-16 sm:h-20 w-auto object-contain mix-blend-multiply"
              />
            </div>

            <div className="text-center mb-6 space-y-1">
              <span className="inline-block px-3 py-0.5 rounded-full bg-red-50 border border-red-200 text-[#BC0202] text-xs font-bold mb-1">
                Primeiro acesso
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                Configure sua Loja
              </h1>
              <p className="text-sm text-zinc-500">
                Preencha os dados básicos para gerar o link exclusivo do seu
                cardápio digital.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Nome da Loja
                </label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Burger do Arthur"
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Link personalizado (Slug)
                </label>
                <input
                  type="text"
                  required
                  value={slug}
                  onChange={(e) =>
                    setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"))
                  }
                  placeholder="ex: burger-do-arthur"
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                />
                <p className="text-xs text-zinc-400 mt-1.5">
                  Seu cardápio ficará em:{" "}
                  <strong className="text-zinc-700">
                    /{slug || "sua-loja"}
                  </strong>
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                    WhatsApp da Loja
                  </label>
                  <input
                    type="tel"
                    maxLength={20}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Ex: 34999999999"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                    Taxa de Entrega (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-md shadow-[#BC0202]/20 cursor-pointer mt-2"
              >
                {submitting ? "Salvando..." : "Criar minha loja"}
              </button>
            </form>

            <div className="mt-5 pt-4 border-t border-stone-100 text-center">
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="text-xs font-bold text-zinc-500 hover:text-zinc-800 transition cursor-pointer disabled:opacity-50"
              >
                {loggingOut ? "Saindo..." : "Sair da conta"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="h-1.5 bg-gradient-to-r from-[#BC0202] via-[#D90404] to-[#830000]" />

      {/* Cabeçalho Administrativo Unificado */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-12 sm:h-14 w-auto object-contain shrink-0 mix-blend-multiply"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black text-zinc-900 truncate tracking-tight">
                {store.name}
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                Painel Administrativo
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleToggleStore}
              disabled={togglingStore}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-bold rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                store.is_open
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                  : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  store.is_open ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                }`}
              />
              {togglingStore
                ? "Atualizando..."
                : store.is_open
                  ? "Loja Aberta"
                  : "Loja Fechada"}
            </button>

            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="px-3.5 sm:px-4 py-2 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs"
            >
              Ver Cardápio Público
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200/80 text-zinc-700 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
            >
              {loggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>

        {/* Subnavegação do Painel */}
        <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-[#BC0202] border border-red-200 whitespace-nowrap"
          >
            Visão Geral
          </Link>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 transition whitespace-nowrap"
          >
            Pedidos e Cozinha
            {activeQueueCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {activeQueueCount}
              </span>
            )}
          </Link>
          <Link
            href="/dashboard/menu"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 transition whitespace-nowrap"
          >
            Cardápio Digital
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Desempenho Financeiro de Hoje */}
        <section className="bg-white rounded-3xl shadow-2xs p-5 sm:p-6 border border-stone-200/80">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                Desempenho de Hoje
              </h2>
              <p className="text-xs text-zinc-500">
                Calculado a partir dos pedidos marcados como concluídos
              </p>
            </div>
            {todayKey && (
              <span className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs text-zinc-600 font-bold">
                {todayKey}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="p-5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-800 block">
                Faturamento Concluído
              </span>
              <strong className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1.5 block tracking-tight">
                R$ {formatPrice(todayRevenue)}
              </strong>
            </div>

            <div className="p-5 bg-[#F8F7F5] border border-stone-200/80 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 block">
                Pedidos Concluídos Hoje
              </span>
              <strong className="text-2xl sm:text-3xl font-black text-zinc-900 mt-1.5 block tracking-tight">
                {todayCount}
              </strong>
            </div>

            <div className="p-5 bg-[#F8F7F5] border border-stone-200/80 rounded-2xl">
              <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 block">
                Ticket Médio
              </span>
              <strong className="text-2xl sm:text-3xl font-black text-zinc-900 mt-1.5 block tracking-tight">
                R$ {formatPrice(averageTicket)}
              </strong>
            </div>
          </div>
        </section>

        {/* Resumo da Loja + Editar Dados */}
        <section className="bg-white rounded-3xl shadow-2xs p-5 sm:p-6 border border-stone-200/80">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                Resumo da Loja
              </h2>
              <p className="text-xs text-zinc-500">
                Link público, contato e taxa padrão de entrega
              </p>
            </div>
            {!editingStore && (
              <button
                type="button"
                onClick={handleStartEditStore}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200/80 text-zinc-800 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer"
              >
                Editar Dados
              </button>
            )}
          </div>

          {editSuccess && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
              {editSuccess}
            </div>
          )}

          {editingStore ? (
            <form onSubmit={handleUpdateStore} className="space-y-4">
              {editError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                    Nome da Loja
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Burger do Arthur"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                    WhatsApp da Loja
                  </label>
                  <input
                    type="tel"
                    maxLength={20}
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Ex: 34999999999"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                    Taxa de Entrega (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editDeliveryFee}
                    onChange={(e) => setEditDeliveryFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs text-zinc-500">
                  Link fixo do cardápio:{" "}
                  <strong className="text-zinc-800">/{store.slug}</strong>
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCancelEditStore}
                    disabled={savingStore}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200/80 text-zinc-700 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={savingStore}
                    className="px-4 py-2 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {savingStore ? "Salvando..." : "Salvar Alterações"}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 text-sm">
              <div className="p-4 bg-[#F8F7F5] rounded-2xl border border-stone-200/80 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-xs text-zinc-500 font-medium block">
                    Link do Cardápio
                  </span>
                  <strong className="text-zinc-900 font-bold truncate block mt-0.5">
                    /{store.slug}
                  </strong>
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer shrink-0 ${
                    copiedLink
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-white hover:bg-stone-100 text-zinc-800 border-stone-300"
                  }`}
                >
                  {copiedLink ? "Copiado!" : "Copiar Link"}
                </button>
              </div>

              <div className="p-4 bg-[#F8F7F5] rounded-2xl border border-stone-200/80">
                <span className="text-xs text-zinc-500 font-medium block">
                  WhatsApp
                </span>
                <strong className="text-zinc-900 font-bold block mt-0.5">
                  {store.phone || "Não informado"}
                </strong>
              </div>

              <div className="p-4 bg-[#F8F7F5] rounded-2xl border border-stone-200/80">
                <span className="text-xs text-zinc-500 font-medium block">
                  Taxa de Entrega
                </span>
                <strong className="text-zinc-900 font-bold block mt-0.5">
                  R$ {formatPrice(store.delivery_fee)}
                </strong>
              </div>
            </div>
          )}
        </section>

        {/* Atalhos Operacionais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          <div className="bg-white rounded-3xl shadow-2xs p-6 border border-stone-200/80 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z"
                    />
                  </svg>
                </span>
                {activeQueueCount > 0 && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {activeQueueCount} na fila agora
                  </span>
                )}
              </div>

              <h2 className="text-lg font-black text-zinc-900">
                Pedidos e Cozinha
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Acompanhe os pedidos chegando ao vivo e avance as etapas de
                preparo e entrega.
              </p>
            </div>

            <Link
              href="/dashboard/orders"
              className="w-full py-3 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-sm font-bold rounded-xl transition text-center shadow-xs"
            >
              Abrir Fila de Pedidos
            </Link>
          </div>

          <div className="bg-white rounded-3xl shadow-2xs p-6 border border-stone-200/80 flex flex-col justify-between gap-5">
            <div className="space-y-2">
              <span className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
                  />
                </svg>
              </span>

              <h2 className="text-lg font-black text-zinc-900">
                Cardápio Digital
              </h2>
              <p className="text-sm text-zinc-500 leading-relaxed">
                Organize categorias, cadastre produtos com fotos, edite preços e
                pause itens esgotados.
              </p>
            </div>

            <Link
              href="/dashboard/menu"
              className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-bold rounded-xl transition text-center shadow-xs"
            >
              Gerenciar Cardápio
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
