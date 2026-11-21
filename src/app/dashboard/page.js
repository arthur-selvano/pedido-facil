"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const router = useRouter();

  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadStore() {
      try {
        const response = await fetch("/api/stores");

        if (response.status === 401) {
          router.push("/login");
          return;
        }

        const data = await response.json();
        setStore(data.store);
      } catch (err) {
        console.error("Erro ao carregar loja:", err);
      } finally {
        setLoading(false);
      }
    }

    loadStore();
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
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-8">
          <a href="#" className="flex justify-center items-center mb-4">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-25 w-auto object-contain"
            />
          </a>
          <h1 className="text-3xl font-black text-gray-800 text-center mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
              />
              <p className="text-xs text-gray-400 mt-1">
                Seu cardápio ficará em: localhost:3000/{slug || "sua-loja"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                WhatsApp da Loja
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 34999999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-25 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-800">{store.name}</h1>
              <p className="text-sm text-gray-500">Painel Administrativo</p>
            </div>
          </div>

          <Link
            href={`/${store.slug}`}
            target="_blank"
            className="px-4 py-2 bg-[#BC0202] hover:bg-[#830000] text-white text-sm font-bold rounded-xl transition"
          >
            Ver Cardápio Público
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Resumo da Loja
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-500 block">Link do Cardápio</span>
              <strong className="text-gray-800">/{store.slug}</strong>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-500 block">WhatsApp</span>
              <strong className="text-gray-800">
                {store.phone || "Não informado"}
              </strong>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <span className="text-gray-500 block">Taxa de Entrega</span>
              <strong className="text-gray-800">
                R$ {Number(store.delivery_fee).toFixed(2).replace(".", ",")}
              </strong>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Cardápio Digital
            </h2>
            <p className="text-sm text-gray-500">
              Crie categorias e adicione os itens disponíveis na sua loja.
            </p>
          </div>

          <Link
            href="/dashboard/menu"
            className="px-4 py-2.5 bg-[#BC0202] hover:bg-[#830000] text-white text-sm font-bold rounded-xl transition"
          >
            Gerenciar Cardápio
          </Link>
        </div>
      </main>
    </div>
  );
}
