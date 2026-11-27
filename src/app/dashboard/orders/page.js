"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
    barClass: "bg-amber-400",
  },
  preparing: {
    label: "Em Preparo",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
    barClass: "bg-orange-500",
  },
  out_for_delivery: {
    label: "Saiu p/ Entrega",
    badgeClass: "bg-zinc-900 text-white border-zinc-900",
    barClass: "bg-zinc-900",
  },
  delivered: {
    label: "Concluído",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
    barClass: "bg-emerald-500",
  },
  canceled: {
    label: "Cancelado",
    badgeClass: "bg-red-100 text-red-700 border-red-300",
    barClass: "bg-red-500",
  },
};

function formatPayment(method) {
  const map = {
    online: "Online (Mercado Pago)",
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    card: "Cartão",
    cash: "Dinheiro",
    money: "Dinheiro",
  };
  return map[method] || method;
}

const PAYMENT_STATUS_BADGE = {
  paid: {
    label: "Pago Online ✓",
    className: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  pending: {
    label: "Aguardando Pagamento",
    className: "bg-amber-100 text-amber-800 border-amber-300",
  },
  failed: {
    label: "Pagamento Recusado",
    className: "bg-red-100 text-red-700 border-red-300",
  },
  refunded: {
    label: "Reembolsado",
    className: "bg-stone-200 text-zinc-700 border-stone-300",
  },
};

function formatPrice(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

async function requestOrders() {
  const response = await fetch("/api/orders");

  if (response.status === 401) {
    return { unauthorized: true };
  }

  if (!response.ok) {
    return { error: "Não foi possível carregar os pedidos." };
  }

  const data = await response.json();
  return { orders: data.orders || [] };
}

export default function OrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("active");
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState("");

  async function fetchOrders() {
    try {
      const result = await requestOrders();

      if (result.unauthorized) {
        router.push("/login");
        return;
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      setOrders(result.orders);
      setError("");
    } catch (err) {
      console.error("Erro ao buscar pedidos:", err);
      setError("Erro de conexão ao atualizar pedidos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;

    async function loadOrders() {
      try {
        const result = await requestOrders();
        if (ignore) return;

        if (result.unauthorized) {
          router.push("/login");
          return;
        }

        if (result.error) {
          setError(result.error);
          return;
        }

        setOrders(result.orders);
        setError("");
      } catch (err) {
        if (!ignore) {
          console.error("Erro ao buscar pedidos:", err);
          setError("Erro de conexão ao atualizar pedidos.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [router]);

  async function handleStatusChange(orderId, newStatus) {
    setUpdatingId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Erro ao atualizar status.");
        return;
      }

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order,
        ),
      );
    } catch (err) {
      console.error("Erro ao alterar status:", err);
      alert("Erro de conexão com o servidor.");
    } finally {
      setUpdatingId(null);
    }
  }

  const activeStatuses = ["pending", "preparing", "out_for_delivery"];
  const activeOrders = orders.filter((o) => activeStatuses.includes(o.status));
  const finishedOrders = orders.filter(
    (o) => !activeStatuses.includes(o.status),
  );
  const displayedOrders = filter === "active" ? activeOrders : finishedOrders;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5]">
        <div className="flex items-center gap-3 text-zinc-600 font-semibold text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BC0202] animate-ping" />
          Carregando fila de pedidos...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="h-1.5 bg-gradient-to-r from-[#BC0202] via-[#D90404] to-[#830000]" />

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
                Gestão de Pedidos
              </h1>
              <p className="inline-flex items-center gap-1.5 text-xs text-zinc-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Atualização automática a cada 15s
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchOrders}
              className="px-3.5 sm:px-4 py-2 bg-stone-100 hover:bg-stone-200/80 text-zinc-800 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer"
            >
              Atualizar Agora
            </button>
            <Link
              href="/dashboard"
              className="px-3.5 sm:px-4 py-2 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs"
            >
              Voltar ao Painel
            </Link>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 transition whitespace-nowrap"
          >
            Visão Geral
          </Link>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-[#BC0202] border border-red-200 whitespace-nowrap"
          >
            Pedidos e Cozinha
            {activeOrders.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-[#BC0202] text-white">
                {activeOrders.length}
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
        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* Abas Segmentadas */}
        <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 bg-white rounded-2xl border border-stone-200/80 shadow-2xs">
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              filter === "active"
                ? "bg-[#BC0202] text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-stone-50"
            }`}
          >
            Em Andamento ({activeOrders.length})
          </button>

          <button
            onClick={() => setFilter("finished")}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              filter === "finished"
                ? "bg-[#BC0202] text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-stone-50"
            }`}
          >
            Concluídos / Cancelados ({finishedOrders.length})
          </button>
        </div>

        {displayedOrders.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xs border border-stone-200/80 p-14 text-center">
            <p className="text-zinc-500 font-semibold text-sm sm:text-base">
              {filter === "active"
                ? "Nenhum pedido em andamento no momento."
                : "Nenhum pedido finalizado ou cancelado ainda."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayedOrders.map((order) => {
              const statusInfo = STATUS_CONFIG[order.status] || {
                label: order.status,
                badgeClass: "bg-stone-100 text-zinc-800 border-stone-300",
                barClass: "bg-stone-400",
              };
              const isUpdating = updatingId === order.id;
              const orderTime = order.created_at
                ? new Date(order.created_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "";

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-3xl shadow-2xs hover:shadow-md transition-shadow border border-stone-200/80 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    <div className={`h-1.5 ${statusInfo.barClass}`} />

                    <div className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-black text-zinc-900 tracking-tight">
                              Pedido #{order.id}
                            </span>
                            {orderTime && (
                              <span className="text-xs text-zinc-400 font-semibold">
                                {orderTime}
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block mt-1.5 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide rounded-md border ${
                              order.delivery_type === "delivery"
                                ? "bg-zinc-100 text-zinc-800 border-zinc-200"
                                : "bg-stone-100 text-stone-700 border-stone-200"
                            }`}
                          >
                            {order.delivery_type === "delivery"
                              ? "ENTREGA"
                              : "RETIRADA NO BALCÃO"}
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-xl border shrink-0 ${statusInfo.badgeClass}`}
                        >
                          {statusInfo.label}
                        </span>
                      </div>

                      <div className="text-sm space-y-1">
                        <p className="font-bold text-zinc-900">
                          {order.customer_name}
                        </p>
                        <p className="text-xs text-zinc-500 font-medium">
                          {order.customer_phone}
                        </p>
                        {order.delivery_type === "delivery" &&
                          order.address && (
                            <div className="text-zinc-700 bg-[#F8F7F5] p-3 rounded-xl border border-stone-200/80 mt-2 text-xs leading-relaxed">
                              <strong className="block text-zinc-900 mb-0.5">
                                Endereço de entrega:
                              </strong>
                              {order.address}
                            </div>
                          )}
                      </div>

                      <div className="border-t border-stone-100 pt-3">
                        <p className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-400 mb-2">
                          Itens da Comanda
                        </p>
                        <ul className="space-y-1.5 text-sm">
                          {(order.items || []).map((item) => (
                            <li
                              key={item.id}
                              className="flex items-center justify-between gap-2 text-zinc-800"
                            >
                              <span className="min-w-0">
                                <strong className="text-[#BC0202]">
                                  {item.quantity}x
                                </strong>{" "}
                                {item.product_name}
                              </span>
                              <span className="text-zinc-500 text-xs font-semibold shrink-0">
                                R${" "}
                                {formatPrice(
                                  Number(item.unit_price) *
                                    Number(item.quantity),
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {order.notes && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs leading-relaxed">
                          <strong className="block mb-0.5">Observação:</strong>
                          {order.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-3.5 border-t border-stone-100 bg-stone-50/50 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs text-zinc-500">
                          Pagamento:{" "}
                          <strong className="text-zinc-800">
                            {formatPayment(order.payment_method)}
                          </strong>
                        </span>
                        {PAYMENT_STATUS_BADGE[order.payment_status] && (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md border ${PAYMENT_STATUS_BADGE[order.payment_status].className}`}
                          >
                            {PAYMENT_STATUS_BADGE[order.payment_status].label}
                          </span>
                        )}
                      </div>
                      <span className="text-base font-black text-zinc-900">
                        R$ {formatPrice(order.total)}
                      </span>
                    </div>

                    {order.status === "pending" && (
                      <div className="flex gap-2">
                        <button
                          disabled={isUpdating}
                          onClick={() =>
                            handleStatusChange(order.id, "preparing")
                          }
                          className="flex-1 py-2.5 px-3 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
                        >
                          {isUpdating ? "Salvando..." : "Aceitar e Preparar"}
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() =>
                            handleStatusChange(order.id, "canceled")
                          }
                          className="py-2.5 px-3 bg-white hover:bg-stone-100 disabled:opacity-50 text-zinc-700 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                    {order.status === "preparing" && (
                      <button
                        disabled={isUpdating}
                        onClick={() =>
                          handleStatusChange(
                            order.id,
                            order.delivery_type === "delivery"
                              ? "out_for_delivery"
                              : "delivered",
                          )
                        }
                        className="w-full py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        {isUpdating
                          ? "Salvando..."
                          : order.delivery_type === "delivery"
                            ? "Saiu para Entrega"
                            : "Concluir Retirada"}
                      </button>
                    )}

                    {order.status === "out_for_delivery" && (
                      <button
                        disabled={isUpdating}
                        onClick={() =>
                          handleStatusChange(order.id, "delivered")
                        }
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        {isUpdating ? "Salvando..." : "Confirmar Entrega"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
