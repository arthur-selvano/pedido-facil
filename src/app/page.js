import Link from "next/link";
import { cacheLife } from "next/cache";

// Cached so the home page stays prerendered (Cache Components forbids a raw
// `new Date()` during prerender); revalidated daily so the year rolls over.
async function CurrentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#F8F7F5] text-zinc-900 flex flex-col">
      {/* Cabeçalho Glass Sticky */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 py-3 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 min-w-0 group"
          >
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-10 sm:h-12 w-auto object-contain shrink-0 mix-blend-multiply transition-transform duration-200 group-hover:scale-[1.03]"
            />
            <span className="font-black text-base sm:text-xl tracking-tight text-zinc-900 whitespace-nowrap">
              Pedido <span className="text-[#BC0202]">Fácil</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-zinc-600">
            <a
              href="#como-funciona"
              className="hover:text-[#BC0202] transition-colors"
            >
              Como funciona
            </a>
            <a
              href="#recursos"
              className="hover:text-[#BC0202] transition-colors"
            >
              Recursos
            </a>
            <a
              href="#vantagens"
              className="hover:text-[#BC0202] transition-colors"
            >
              Por que usar
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <Link
              href="/login"
              className="px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-bold text-zinc-700 hover:text-zinc-900 hover:bg-stone-100 rounded-xl transition whitespace-nowrap"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-sm shadow-[#BC0202]/25 whitespace-nowrap"
            >
              Criar Loja Grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-white border-b border-stone-200/80 px-4 sm:px-6 pt-10 pb-14 sm:pt-16 sm:pb-24">
          {/* Brilho sutil de fundo */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(188,2,2,0.08),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(188,2,2,0.04),transparent_45%)]"
          />

          <div className="relative max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Coluna de Texto */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-50 border border-red-200/90 text-[#BC0202] text-xs font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-[#BC0202] animate-pulse" />
                Zero comissão por pedido • Cardápio Digital + Cozinha
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[3.35rem] font-black text-zinc-900 leading-[1.08] tracking-tight">
                Seu delivery próprio,{" "}
                <span className="text-[#BC0202]">bonito no celular</span> e
                organizado na cozinha.
              </h1>

              <p className="text-base sm:text-lg text-zinc-600 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                Crie o link exclusivo da sua lanchonete, pizzaria ou hamburgueria
                em poucos minutos. Seu cliente pede sem baixar aplicativo e você
                fica com <strong className="text-zinc-900">100% do lucro</strong>{" "}
                de cada venda.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3 pt-1">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-sm sm:text-base font-bold rounded-2xl transition shadow-lg shadow-[#BC0202]/25"
                >
                  Criar meu cardápio agora
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                    />
                  </svg>
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-6 py-4 bg-stone-100 hover:bg-stone-200/80 text-zinc-800 text-sm sm:text-base font-bold rounded-2xl border border-stone-200 transition"
                >
                  Já tenho conta
                </Link>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-x-6 gap-y-2 text-xs sm:text-sm text-zinc-500 font-medium">
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-emerald-600 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                  0% de taxa sobre vendas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-emerald-600 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                  Link exclusivo /sua-loja
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 text-emerald-600 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m4.5 12.75 6 6 9-13.5"
                    />
                  </svg>
                  Pronto para WhatsApp e Instagram
                </span>
              </div>
            </div>

            {/* Coluna Direita — Vitrine + Painel da Cozinha */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md">
                {/* Selo flutuante de faturamento */}
                <div className="mb-3 flex items-center justify-between gap-3 bg-zinc-900 text-white rounded-2xl px-4 py-3 shadow-lg">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center shrink-0">
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
                          d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-zinc-400 font-medium">
                        Faturamento de hoje no painel
                      </p>
                      <p className="text-sm font-black tracking-tight truncate">
                        R$ 1.284,50{" "}
                        <span className="text-xs font-semibold text-emerald-400">
                          • 24 concluídos
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-bold text-zinc-200 shrink-0">
                    100% seu
                  </span>
                </div>

                {/* Container principal do Mockup */}
                <div className="bg-[#F8F7F5] rounded-3xl border border-stone-200/90 p-4 sm:p-5 shadow-xl shadow-zinc-900/5 space-y-3.5">
                  {/* Barra da vitrine */}
                  <div className="flex items-center justify-between gap-2 bg-white rounded-2xl px-3.5 py-2.5 border border-stone-200/80">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                          Link público da loja
                        </p>
                        <p className="text-xs sm:text-sm font-bold text-zinc-800 truncate">
                          pedidofacil.com/burger-da-vila
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Aberta
                    </span>
                  </div>

                  {/* Card de Comanda na Cozinha */}
                  <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
                    <div className="h-1.5 bg-gradient-to-r from-[#BC0202] via-amber-500 to-emerald-500" />
                    <div className="p-4 space-y-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-zinc-900">
                              Pedido #104
                            </span>
                            <span className="text-[11px] text-zinc-400 font-semibold">
                              20:14
                            </span>
                          </div>
                          <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-extrabold tracking-wide rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                            ENTREGA • Mariana Costa
                          </span>
                        </div>
                        <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          Pendente
                        </span>
                      </div>

                      <div className="text-xs text-zinc-700 space-y-1.5 bg-stone-50 rounded-xl p-3 border border-stone-200/70">
                        <div className="flex items-center justify-between">
                          <span>
                            <strong className="text-[#BC0202]">2x</strong>{" "}
                            Smash Bacon Artesanal
                          </span>
                          <span className="font-semibold text-zinc-500">
                            R$ 57,80
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>
                            <strong className="text-[#BC0202]">1x</strong>{" "}
                            Guaraná Lata 350ml
                          </span>
                          <span className="font-semibold text-zinc-500">
                            R$ 6,00
                          </span>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        <strong>Observação:</strong> Carne ao ponto, tirar a
                        cebola de um lanche.
                      </div>

                      <div className="pt-2 border-t border-stone-100 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">
                            Pagamento:{" "}
                            <strong className="text-zinc-800">PIX</strong> (c/
                            entrega)
                          </span>
                          <span className="font-black text-base text-zinc-900">
                            R$ 68,80
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2 py-2.5 bg-[#BC0202] text-white text-xs font-bold rounded-xl text-center shadow-xs">
                            Aceitar e Preparar
                          </div>
                          <div className="py-2.5 bg-stone-100 text-zinc-600 text-xs font-bold rounded-xl border border-stone-200 text-center">
                            Cancelar
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Faixa Comparativa / Vantagens */}
        <section
          id="vantagens"
          className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-5 bg-white rounded-3xl border border-stone-200/80 p-6 sm:p-7 shadow-2xs flex flex-col justify-between">
              <div className="space-y-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-zinc-400">
                  Apps de terceiros
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-zinc-800">
                  Onde sua margem fica pelo caminho
                </h2>
              </div>
              <ul className="mt-5 space-y-3 text-sm text-zinc-600">
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-red-50 text-[#BC0202] font-bold text-xs flex items-center justify-center shrink-0">
                    ✕
                  </span>
                  <span>
                    Comissões pesadas que corroem de 12% a 27% de cada pedido.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-red-50 text-[#BC0202] font-bold text-xs flex items-center justify-center shrink-0">
                    ✕
                  </span>
                  <span>
                    Seus clientes fiéis vendo promoções do concorrente ao lado.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-red-50 text-[#BC0202] font-bold text-xs flex items-center justify-center shrink-0">
                    ✕
                  </span>
                  <span>
                    Pedidos bagunçados no WhatsApp em pleno horário de pico.
                  </span>
                </li>
              </ul>
            </div>

            <div className="lg:col-span-7 bg-gradient-to-br from-[#BC0202] to-[#830000] text-white rounded-3xl p-6 sm:p-8 shadow-lg shadow-[#BC0202]/15 flex flex-col justify-between">
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold">
                  No Pedido Fácil
                </span>
                <h2 className="text-xl sm:text-2xl font-black leading-snug">
                  Sua própria vitrine digital, sem intermediários
                </h2>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                  <strong className="block font-bold text-white mb-1">
                    Zero comissão por venda
                  </strong>
                  <p className="text-xs text-red-100 leading-relaxed">
                    Receba direto via PIX, cartão na entrega ou dinheiro. Todo o
                    valor fica no seu caixa.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                  <strong className="block font-bold text-white mb-1">
                    Só a sua marca na tela
                  </strong>
                  <p className="text-xs text-red-100 leading-relaxed">
                    Link limpo para colocar na bio do Instagram e resposta
                    automática do WhatsApp.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                  <strong className="block font-bold text-white mb-1">
                    Pedido já chega calculado
                  </strong>
                  <p className="text-xs text-red-100 leading-relaxed">
                    Itens, quantidades, taxa de entrega, forma de pagamento e
                    endereço padronizados.
                  </p>
                </div>
                <div className="bg-white/10 backdrop-blur-xs rounded-2xl p-4 border border-white/15">
                  <strong className="block font-bold text-white mb-1">
                    Sem instalar aplicativo
                  </strong>
                  <p className="text-xs text-red-100 leading-relaxed">
                    Abre rápido em qualquer celular e permite fechar o pedido em
                    poucos toques.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Como Funciona */}
        <section
          id="como-funciona"
          className="max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-20 space-y-8 sm:space-y-10"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#BC0202]">
              Simples de verdade
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
              Coloque sua loja no ar em 3 passos
            </h2>
            <p className="text-sm sm:text-base text-zinc-600">
              Feito para quem precisa vender hoje, sem configurações técnicas
              complicadas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-2xs hover:shadow-md transition-shadow space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-[#BC0202] font-black text-base inline-flex items-center justify-center">
                  01
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  2 minutos
                </span>
              </div>
              <h3 className="font-black text-lg text-zinc-900">
                Personalize sua loja
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Escolha seu link exclusivo (ex: <strong>/sua-loja</strong>),
                informe seu WhatsApp e defina a taxa de entrega padrão.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-2xs hover:shadow-md transition-shadow space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-[#BC0202] font-black text-base inline-flex items-center justify-center">
                  02
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  Cardápio vivo
                </span>
              </div>
              <h3 className="font-black text-lg text-zinc-900">
                Cadastre seus produtos
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Crie categorias como Lanches, Pizzas e Bebidas, adicione fotos,
                descrições e pause itens esgotados quando precisar.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/80 shadow-2xs hover:shadow-md transition-shadow space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="w-11 h-11 rounded-2xl bg-red-50 border border-red-200 text-[#BC0202] font-black text-base inline-flex items-center justify-center">
                  03
                </span>
                <span className="text-xs font-bold text-zinc-400">
                  Operação fluida
                </span>
              </div>
              <h3 className="font-black text-lg text-zinc-900">
                Compartilhe e produza
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Divulgue seu link no WhatsApp e Instagram e acompanhe cada
                pedido chegando ao vivo na tela de Gestão de Pedidos.
              </p>
            </div>
          </div>
        </section>

        {/* Recursos Operacionais */}
        <section
          id="recursos"
          className="max-w-6xl mx-auto px-4 sm:px-6 pb-14 sm:pb-20"
        >
          <div className="bg-white rounded-3xl border border-stone-200/80 shadow-2xs p-6 sm:p-10 space-y-8">
            <div className="max-w-2xl space-y-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-[#BC0202]">
                Painel completo
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                Pensado para a rotina real de balcão, cozinha e entrega
              </h2>
              <p className="text-sm sm:text-base text-zinc-500">
                Tudo o que você precisa para atender rápido no horário de pico,
                sem depender de papel ou planilhas.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
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
                      d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-900">
                  Fila da cozinha ao vivo
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Atualização automática a cada 15s, identificação clara de
                  Entrega ou Retirada e avanço de status com um clique.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
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
                      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-900">
                  Métricas financeiras do dia
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Acompanhe faturamento concluído, total de entregas realizadas
                  e ticket médio do dia em tempo real.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
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
                      d="M5.636 5.636a9 9 0 1 0 12.728 0M12 3v9"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-900">
                  Abre e fecha com 1 toque
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Encerrou o expediente? Feche a loja no painel para bloquear
                  novos pedidos mantendo a vitrine visível.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
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
                      d="M15.75 5.25v13.5m-7.5-13.5v13.5"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-900">
                  Pausa rápida de esgotados
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Acabou um item na noite? Pause com um clique e proteja o
                  histórico de produtos que já possuem vendas.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
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
                      d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-900">
                  Sacola rápida no celular
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Seu cliente filtra por categoria, escolhe Entrega ou Retirada,
                  informa observações e finaliza sem criar senha.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#F8F7F5] border border-stone-200/80 space-y-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-200 text-[#BC0202] flex items-center justify-center">
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
                      d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-zinc-900">
                  Preços validados no servidor
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
                  Subtotal, taxa de entrega e disponibilidade são conferidos com
                  segurança no backend a cada pedido.
                </p>
              </div>
            </div>

            {/* Banner Final de Conversão */}
            <div className="rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-[#5C0202] p-6 sm:p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-1.5 text-center md:text-left">
                <h3 className="text-xl sm:text-2xl font-black">
                  Pronto para colocar seu cardápio digital no ar?
                </h3>
                <p className="text-xs sm:text-sm text-zinc-300">
                  Crie sua conta gratuitamente e configure sua loja em poucos
                  minutos.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
                <Link
                  href="/register"
                  className="px-6 py-3.5 bg-gradient-to-b from-[#DF0A0A] to-[#B00000] hover:from-[#C40404] hover:to-[#8F0000] text-white text-sm font-bold rounded-xl transition text-center shadow-md"
                >
                  Começar Gratuitamente
                </Link>
                <Link
                  href="/login"
                  className="px-5 py-3.5 bg-white/10 hover:bg-white/15 text-white text-sm font-bold rounded-xl border border-white/15 transition text-center"
                >
                  Entrar no Painel
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-white border-t border-stone-200/80 px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-8 w-auto object-contain mix-blend-multiply"
            />
            <span className="font-bold text-zinc-700">
              Pedido <span className="text-[#BC0202]">Fácil</span>
            </span>
          </div>

          <p>
            © <CurrentYear /> Pedido Fácil. Todos os direitos reservados.
          </p>

          <div className="flex items-center gap-4 font-semibold text-zinc-600">
            <Link href="/login" className="hover:text-[#BC0202] transition">
              Entrar
            </Link>
            <Link href="/register" className="hover:text-[#BC0202] transition">
              Criar Loja
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
