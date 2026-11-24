"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setconfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Erro ao criar conta.");
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("As senhas não coincidem.");
        return;
      }

      router.push("/login");
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
          Crie sua Conta
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Cadastre-se para gerenciar sua loja e seus pedidos no Pedido Fácil
        </p>

        {/* Caixa vermelha que só aparece se existir alguma mensagem de erro */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1 font-bold">
              Seu Nome
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Arthur Oliveira"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
            />
          </div>

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

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Confirme sua senha
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setconfirmPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full px-3 py-2 border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#BC0202] hover:bg-[#830000] disabled:bg-[#830000] text-white font-bold rounded-xl transition cursor-pointer"
          >
            {loading ? "Cadastrando..." : "Criar minha conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Já tem uma conta?{" "}
          <Link
            href="/login"
            className="text-[#BC0202] font-semibold hover:underline"
          >
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  );
}
