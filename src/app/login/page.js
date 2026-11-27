"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "E-mail ou senha inválidos.");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor.");
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-[#F8F7F5] px-4 py-10 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(188,2,2,0.08),transparent_55%)]"
      />

      <div className="relative w-full max-w-md space-y-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-[#BC0202] transition"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
          Voltar para a página inicial
        </Link>

        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xl shadow-zinc-900/5 overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-[#BC0202] to-[#830000]" />

          <div className="p-6 sm:p-8">
            <Link href="/" className="flex justify-center items-center mb-5">
              <img
                src="/logo.png"
                alt="Logo Pedido Fácil"
                className="h-16 sm:h-20 w-auto object-contain mix-blend-multiply"
              />
            </Link>

            <div className="text-center mb-6 space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                Acesse sua conta
              </h1>
              <p className="text-sm text-zinc-500">
                Gerencie seu cardápio e acompanhe a fila da cozinha.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition shadow-md shadow-[#BC0202]/20 cursor-pointer mt-2"
              >
                {loading ? "Entrando..." : "Entrar no Painel"}
              </button>
            </form>

            <p className="mt-6 pt-5 border-t border-stone-100 text-center text-sm text-zinc-600">
              Ainda não tem uma conta?{" "}
              <Link
                href="/register"
                className="text-[#BC0202] font-bold hover:underline"
              >
                Criar loja grátis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
