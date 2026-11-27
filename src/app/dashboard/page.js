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
  const [copiedLink, setCopiedLink] = useState(false);
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
    } catch (err) {
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
    } catch (err) {
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
    } catch (err) {
      alert(`Copie o link: ${publicUrl}`);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 font-medium">Carregando painel...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-6 sm:p-8">
          <div className="flex justify-center items-center mb-4">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-20 sm:h-24 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-800 text-center mb-2">
            Configure sua Loja
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Preencha os dados básicos para gerar o link do seu cardápio digital.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleCreateStore} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Nome da Loja
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Burger do Arthur"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
              />
              <p className="text-xs text-gray-400 mt-1">
                Seu cardápio ficará em: /{slug || "sua-loja"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                WhatsApp da Loja
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 34999999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                Taxa de Entrega (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-[#BC0202] hover:bg-[#830000] disabled:bg-[#830000] text-white font-bold rounded-xl transition cursor-pointer"
            >
              {submitting ? "Salvando..." : "Criar minha loja"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-16 sm:h-20 w-auto object-contain shrink-0"
            />
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-800 truncate">
                {store.name}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Painel Administrativo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleToggleStore}
              disabled={togglingStore}
              className={`px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                store.is_open
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                  : "bg-red-50 text-red-700 border-red-300 hover:bg-red-100"
              }`}
            >
              {togglingStore
                ? "Atualizando..."
                : store.is_open
                  ? "Loja Aberta"
                  : "Loja Fechada"}
            </button>

            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="px-3.5 sm:px-4 py-2 bg-[#BC0202] hover:bg-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition"
            >
              Ver Cardápio Público
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Desempenho Financeiro de Hoje */}
        <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-200">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              Desempenho de Hoje
            </h2>
            <span className="text-xs text-gray-400 font-medium">
              {todayKey}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-xs font-semibold text-emerald-800 block">
                Faturamento Concluído
              </span>
              <strong className="text-xl sm:text-2xl font-black text-emerald-900 mt-1 block">
                R$ {formatPrice(todayRevenue)}
              </strong>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-xs font-semibold text-gray-500 block">
                Pedidos Concluídos Hoje
              </span>
              <strong className="text-xl sm:text-2xl font-black text-gray-900 mt-1 block">
                {todayCount}
              </strong>
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <span className="text-xs font-semibold text-gray-500 block">
                Ticket Médio
              </span>
              <strong className="text-xl sm:text-2xl font-black text-gray-900 mt-1 block">
                R$ {formatPrice(averageTicket)}
              </strong>
            </div>
          </div>
        </div>

        {/* Resumo da Loja + Copiar Link */}
        <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4">
            Resumo da Loja
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-xs text-gray-500 block">
                  Link do Cardápio
                </span>
                <strong className="text-gray-800 truncate block">
                  /{store.slug}
                </strong>
              </div>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 text-xs font-bold rounded-lg border border-gray-300 transition cursor-pointer shrink-0"
              >
                {copiedLink ? "Copiado!" : "Copiar Link"}
              </button>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 block">WhatsApp</span>
              <strong className="text-gray-800">
                {store.phone || "Não informado"}
              </strong>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xs text-gray-500 block">
                Taxa de Entrega
              </span>
              <strong className="text-gray-800">
                R$ {formatPrice(store.delivery_fee)}
              </strong>
            </div>
          </div>
        </div>

        {/* Atalho Pedidos e Cozinha */}
        <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800">
                Pedidos e Cozinha
              </h2>
              {activeQueueCount > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                  {activeQueueCount} na fila
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Acompanhe os pedidos em tempo real e atualize o andamento da fila.
            </p>
          </div>

          <Link
            href="/dashboard/orders"
            className="px-4 py-2.5 bg-[#BC0202] hover:bg-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition text-center shrink-0"
          >
            Abrir Pedidos
          </Link>
        </div>

        {/* Atalho Cardápio Digital */}
        <div className="bg-white rounded-2xl shadow-md p-5 sm:p-6 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">
              Cardápio Digital
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Crie categorias e adicione os itens disponíveis na sua loja.
            </p>
          </div>

          <Link
            href="/dashboard/menu"
            className="px-4 py-2.5 bg-[#BC0202] hover:bg-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition text-center shrink-0"
          >
            Gerenciar Cardápio
          </Link>
        </div>
      </main>
    </div>
  );
}
