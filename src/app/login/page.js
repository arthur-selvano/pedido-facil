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
        setError(data.error || "E-mail ou senha inválidos");
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      setError("Não foi possível conectar ao servidor.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 rounded-lg">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-md p-8">
        <a href="#" className="flex justify-center items-center mb-4">
          <img
            src="/logo.png"
            alt="Logo Pedido Fácil"
            className="h-auto w-70 object-contain"
          />
        </a>
        <h1 className="text-3xl font-black text-gray-800 text-center mb-2">
          Acesse sua conta
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Gerencie sua loja e acompanhe seus pedidos.
        </p>

        {/* Caixa vermelha que só aparece se existir alguma mensagem de erro */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#BC0202] hover:bg-[#830000] disabled:bg-[#830000] text-white font-bold rounded-xl transition cursor-pointer"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Não tem uma conta?{" "}
          <Link
            href="/register"
            className="text-[#BC0202] font-semibold hover:underline"
          >
            Fazer Cadastro
          </Link>
        </p>
      </div>
    </div>
  );
}
