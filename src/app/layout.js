import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Pedido Fácil — Cardápio Digital e Gestão de Pedidos sem Comissão",
  description:
    "Crie o cardápio digital da sua lanchonete, receba pedidos direto no painel da cozinha e venda sem pagar comissão.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F7F5] text-zinc-900 selection:bg-[#BC0202]/15 selection:text-[#830000]">
        {children}
      </body>
    </html>
  );
}
