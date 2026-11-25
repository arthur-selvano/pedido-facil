import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col">
      {/* Cabeçalho */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-3.5 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-11 sm:h-14 w-auto object-contain shrink-0"
            />
            <span className="font-black text-base sm:text-xl tracking-tight text-gray-900 whitespace-nowrap">
              Pedido <span className="text-[#BC0202]">Fácil</span>
            </span>
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link
              href="/login"
              className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition whitespace-nowrap"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="px-3.5 sm:px-5 py-2 bg-[#BC0202] hover:bg-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-sm whitespace-nowrap"
            >
              Criar Loja
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-white border-b border-gray-200 px-4 sm:px-6 py-10 sm:py-20">
          <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-center lg:text-left">
              <span className="inline-block px-3 py-1 rounded-full bg-red-50 border border-red-200 text-[#BC0202] text-xs font-bold">
                Zero comissão por pedido • Cardápio + Cozinha
              </span>

              <h1 className="text-3xl sm:text-5xl font-black text-gray-900 leading-tight tracking-tight">
                Seu delivery próprio, direto no celular do cliente.
              </h1>

              <p className="text-sm sm:text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Crie o link exclusivo da sua lanchonete em minutos, receba
                pedidos organizados na tela da cozinha e pare de perder margem
                para aplicativos de terceiros.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-2">
                <Link
                  href="/register"
                  className="px-6 py-3.5 bg-[#BC0202] hover:bg-[#830000] text-white text-sm sm:text-base font-bold rounded-xl transition text-center shadow-md"
                >
                  Criar meu cardápio agora
                </Link>
                <Link
                  href="/login"
                  className="px-6 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm sm:text-base font-bold rounded-xl border border-gray-300 transition text-center"
                >
                  Acessar meu painel
                </Link>
              </div>
            </div>

            {/* Preview visual do sistema */}
            <div className="lg:col-span-5">
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-md space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-gray-200 pb-3">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-semibold">
                      Link da sua vitrine
                    </p>
                    <p className="text-sm font-bold text-gray-800 truncate">
                      pedidofacil.com/sua-loja
                    </p>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 shrink-0">
                    Loja Aberta
                  </span>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-black text-sm text-gray-900 block">
                        Pedido #104
                      </span>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[11px] font-bold rounded bg-zinc-100 text-zinc-800 border border-zinc-300">
                        ENTREGA
                      </span>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                      Pendente
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 space-y-1">
                    <p>
                      <strong className="text-[#BC0202]">2x</strong> X-Bacon
                      Artesanal
                    </p>
                    <p>
                      <strong className="text-[#BC0202]">1x</strong>{" "}
                      Refrigerante Lata 350ml
                    </p>
                  </div>

                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <strong>Obs:</strong> Carne ao ponto, sem cebola.
                  </div>

                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">Pagamento: PIX</span>
                      <span className="font-black text-sm text-gray-900">
                        R$ 54,80
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <span className="py-1.5 px-2 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-lg border border-gray-300 text-center">
                        Imprimir Comanda
                      </span>
                      <span className="py-1.5 px-2 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-300 text-center">
                        WhatsApp
                      </span>
                    </div>

                    <div className="w-full py-2 bg-[#BC0202] text-white text-xs font-bold rounded-lg text-center">
                      Aceitar e Preparar
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-6 sm:space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Pronto para operar em 3 passos
            </h2>
            <p className="text-sm sm:text-base text-gray-600">
              Sem burocracia, sem instalar nada no celular do cliente e sem
              porcentagem sobre as suas vendas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-2.5">
              <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-[#BC0202] font-black text-sm inline-flex items-center justify-center">
                1
              </span>
              <h3 className="font-bold text-base sm:text-lg text-gray-900">
                Configure sua loja
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Cadastre o nome, WhatsApp, taxa de entrega e organize seus
                produtos por categorias com foto e preço.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-2.5">
              <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-[#BC0202] font-black text-sm inline-flex items-center justify-center">
                2
              </span>
              <h3 className="font-bold text-base sm:text-lg text-gray-900">
                Divulgue seu link
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Coloque na bio do Instagram ou envie no WhatsApp. O cliente
                escolhe os itens, informa o endereço e finaliza em segundos.
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-200 shadow-sm space-y-2.5">
              <span className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 text-[#BC0202] font-black text-sm inline-flex items-center justify-center">
                3
              </span>
              <h3 className="font-bold text-base sm:text-lg text-gray-900">
                Controle a cozinha
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Acompanhe os pedidos na fila, imprima a comanda para produção e
                avise o cliente no WhatsApp com um toque.
              </p>
            </div>
          </div>
        </section>

        {/* Recursos Operacionais */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 sm:pb-20">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 sm:p-10 space-y-6 sm:space-y-8">
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                Feito para a rotina real de balcão e entrega
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                Ferramentas diretas para evitar erro na produção e agilizar o
                atendimento no horário de pico.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 text-sm">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                <h3 className="font-bold text-gray-900">
                  Fila da cozinha com atualização automática
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Separação clara entre Entrega e Retirada, observações em
                  destaque e avanço de etapa com um toque.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                <h3 className="font-bold text-gray-900">
                  Comanda térmica e aviso no WhatsApp
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Imprima pedidos formatados para bobina de 58mm/80mm e envie
                  atualizações prontas para o cliente em 1 clique.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                <h3 className="font-bold text-gray-900">
                  Controle de estoque e Loja Aberta/Fechada
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Pause itens esgotados no meio do expediente e bloqueie novos
                  pedidos fora do horário sem tirar o cardápio do ar.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
                <h3 className="font-bold text-gray-900">
                  100% do faturamento na sua conta
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  Receba direto via PIX, cartão na entrega ou dinheiro sem
                  descontos por pedido realizado.
                </p>
              </div>
            </div>

            {/* CTA Final */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-base sm:text-lg text-gray-900">
                  Pronto para colocar seu cardápio no ar?
                </h3>
                <p className="text-xs sm:text-sm text-gray-500">
                  Cadastre sua conta e configure sua primeira loja em poucos
                  minutos.
                </p>
              </div>

              <Link
                href="/register"
                className="w-full sm:w-auto px-6 py-3 bg-[#BC0202] hover:bg-[#830000] text-white text-sm font-bold rounded-xl transition text-center shrink-0"
              >
                Começar Gratuitamente
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-gray-200 px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-3 text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} Pedido Fácil. Todos os direitos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
