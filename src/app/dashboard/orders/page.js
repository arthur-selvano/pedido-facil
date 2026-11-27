"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const STATUS_CONFIG = {
  pending: {
    label: "Pendente",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-300",
  },
  preparing: {
    label: "Em Preparo",
    badgeClass: "bg-orange-100 text-orange-800 border-orange-300",
  },
  out_for_delivery: {
    label: "Saiu p/ Entrega",
    badgeClass: "bg-zinc-800 text-white border-zinc-900",
  },
  delivered: {
    label: "Concluído",
    badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
  },
  canceled: {
    label: "Cancelado",
    badgeClass: "bg-red-100 text-red-700 border-red-300",
  },
};

function formatPayment(method) {
  const map = {
    pix: "PIX",
    credit_card: "Cartão de Crédito",
    debit_card: "Cartão de Débito",
    card: "Cartão",
    cash: "Dinheiro",
    money: "Dinheiro",
  };
  return map[method] || method;
}

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
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 font-medium">Carregando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-20 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Gestão de Pedidos
              </h1>
              <p className="text-sm text-gray-500">
                Atualização automática a cada 15 segundos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-bold rounded-xl border border-gray-300 transition cursor-pointer"
            >
              Atualizar Agora
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-[#BC0202] hover:bg-[#830000] text-white text-sm font-bold rounded-xl transition"
            >
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              filter === "active"
                ? "bg-[#BC0202] text-white shadow-sm"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Em Andamento ({activeOrders.length})
          </button>

          <button
            onClick={() => setFilter("finished")}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold transition cursor-pointer ${
              filter === "finished"
                ? "bg-[#BC0202] text-white shadow-sm"
                : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            Concluídos / Cancelados ({finishedOrders.length})
          </button>
        </div>

        {displayedOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <p className="text-gray-500 font-medium">
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
                badgeClass: "bg-gray-100 text-gray-800 border-gray-300",
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
                  className="bg-white rounded-2xl shadow-md border border-gray-200 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-gray-900">
                            Pedido #{order.id}
                          </span>
                          {orderTime && (
                            <span className="text-xs text-gray-400 font-medium">
                              {orderTime}
                            </span>
                          )}
                        </div>
                        <span
                          className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-bold rounded-md border ${
                            order.delivery_type === "delivery"
                              ? "bg-zinc-100 text-zinc-800 border-zinc-300"
                              : "bg-stone-100 text-stone-700 border-stone-300"
                          }`}
                        >
                          {order.delivery_type === "delivery"
                            ? "ENTREGA"
                            : "RETIRADA NO BALCÃO"}
                        </span>
                      </div>

                      <span
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${statusInfo.badgeClass}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <div className="text-sm space-y-1">
                      <p className="font-bold text-gray-800">
                        {order.customer_name}
                      </p>
                      <p className="text-gray-600">{order.customer_phone}</p>
                      {order.delivery_type === "delivery" && order.address && (
                        <p className="text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-200 mt-2 text-xs">
                          <strong className="block text-gray-900 mb-0.5">
                            Endereço:
                          </strong>
                          {order.address}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Itens do Pedido
                      </p>
                      <ul className="space-y-1.5 text-sm">
                        {(order.items || []).map((item) => (
                          <li
                            key={item.id}
                            className="flex items-center justify-between text-gray-800"
                          >
                            <span>
                              <strong className="text-[#BC0202]">
                                {item.quantity}x
                              </strong>{" "}
                              {item.product_name}
                            </span>
                            <span className="text-gray-500 text-xs">
                              R${" "}
                              {formatPrice(
                                Number(item.unit_price) * Number(item.quantity),
                              )}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {order.notes && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        <strong className="block mb-0.5">Observação:</strong>
                        {order.notes}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-3 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        Pagamento:{" "}
                        <strong className="text-gray-800">
                          {formatPayment(order.payment_method)}
                        </strong>
                      </span>
                      <span className="text-base font-black text-gray-900">
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
                          className="flex-1 py-2 px-3 bg-[#BC0202] hover:bg-[#830000] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          {isUpdating ? "Salvando..." : "Aceitar e Preparar"}
                        </button>
                        <button
                          disabled={isUpdating}
                          onClick={() =>
                            handleStatusChange(order.id, "canceled")
                          }
                          className="py-2 px-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-xs font-bold rounded-xl border border-gray-300 transition cursor-pointer"
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
                        className="w-full py-2 px-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
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
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition cursor-pointer"
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
