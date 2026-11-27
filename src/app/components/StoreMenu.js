"use client";

import { useState, useCallback } from "react";
import OnlinePaymentModal from "./OnlinePaymentModal";

function formatMoney(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

export default function StoreMenu({ store, categories, products }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [brokenImages, setBrokenImages] = useState({});

  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const hasOnlinePayment = Boolean(store.has_online_payment);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(
    hasOnlinePayment ? "online" : "pix",
  );
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [activeOnlineOrder, setActiveOnlineOrder] = useState(null);
  const [paymentReturn, setPaymentReturn] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const verifyOrderPayment = useCallback(async (orderId) => {
    setCheckingPayment(true);
    try {
      const qs = new URLSearchParams({ order_id: String(orderId) });
      const res = await fetch(
        `/api/payments/mercadopago/status?${qs.toString()}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      setPaymentReturn((prev) => ({
        orderId: data.orderId,
        paymentStatus: data.payment_status,
        total: data.total,
        order: prev?.order || null,
      }));
    } catch {
      // Mantém o estado atual se falhar a consulta
    } finally {
      setCheckingPayment(false);
    }
  }, []);

  const handleOnlinePaid = useCallback((orderId) => {
    setPaymentReturn((prev) => ({
      orderId,
      paymentStatus: "paid",
      total: prev?.total ?? null,
      order: prev?.order || null,
    }));
  }, []);

  const isOpen = store.is_open !== false;
  const deliveryFee = Number(store.delivery_fee) || 0;

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category_id === selectedCategory);

  function addToCart(product) {
    if (!isOpen) return;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) => item.product.id === product.id,
      );

      if (existingIndex > -1) {
        const updated = [...prevCart];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      return [...prevCart, { product, quantity: 1 }];
    });
  }

  function decreaseQuantity(productId) {
    setCart((prevCart) =>
      prevCart
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function getItemQuantity(productId) {
    const found = cart.find((item) => item.product.id === productId);
    return found ? found.quantity : 0;
  }

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const subtotal = cart.reduce(
    (acc, item) => acc + Number(item.product.price) * item.quantity,
    0,
  );
  const finalTotal =
    deliveryType === "delivery" ? subtotal + deliveryFee : subtotal;

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!isOpen) {
      setOrderError("A loja está fechada no momento e não aceita pedidos.");
      return;
    }

    setOrderError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: store.id,
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_type: deliveryType,
          address: deliveryType === "delivery" ? address : null,
          payment_method: paymentMethod,
          notes,
          items: cart.map((item) => ({
            product_id: item.product.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOrderError(data.error || "Não foi possível concluir o pedido.");
        setSubmitting(false);
        return;
      }

      if (paymentMethod === "online") {
        setCart([]);
        setIsCheckoutOpen(false);
        setActiveOnlineOrder(data.order);
        setPaymentReturn({
          orderId: data.order.id,
          paymentStatus: "pending",
          total: Number(data.order.total),
          order: data.order,
        });
        return;
      }

      setOrderSuccess(data.order);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch {
      setOrderError("Erro de conexão ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5] pb-32">
      {/* Faixa superior da marca */}
      <div className="h-1.5 bg-gradient-to-r from-[#BC0202] via-[#D90404] to-[#830000]" />

      {/* Cabeçalho da Loja */}
      <header className="bg-white border-b border-stone-200/80 px-4 sm:px-6 py-5">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-stone-50 border border-stone-200/80 flex items-center justify-center p-2 shrink-0">
              <img
                src="/logo.png"
                alt="Logo Pedido Fácil"
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight leading-tight">
                  {store.name}
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded-full border shrink-0 ${
                    isOpen
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-red-50 text-red-700 border-red-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOpen ? "bg-emerald-500 animate-pulse" : "bg-red-500"
                    }`}
                  />
                  {isOpen ? "Aberta agora" : "Fechada"}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-zinc-600 font-medium">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200/70">
                  Entrega:{" "}
                  <strong className="text-zinc-900">
                    {deliveryFee === 0
                      ? "Grátis"
                      : `R$ ${formatMoney(deliveryFee)}`}
                  </strong>
                </span>
                {store.phone && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 border border-stone-200/70">
                    WhatsApp:{" "}
                    <strong className="text-zinc-900">{store.phone}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {!isOpen && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-900">
              <h2 className="font-bold text-sm sm:text-base">
                Loja fechada no momento
              </h2>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">
                Você pode consultar os itens e preços à vontade, mas novos
                pedidos estão temporariamente bloqueados.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Banner de Retorno do Pagamento Online */}
      {paymentReturn && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-5">
          <div
            className={`rounded-2xl p-5 shadow-xs border ${
              paymentReturn.paymentStatus === "paid"
                ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                : paymentReturn.paymentStatus === "failed"
                  ? "bg-red-50 border-red-300 text-red-900"
                  : "bg-amber-50 border-amber-300 text-amber-950"
            }`}
          >
            <span
              className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold mb-1.5 ${
                paymentReturn.paymentStatus === "paid"
                  ? "bg-emerald-200/70 text-emerald-900"
                  : paymentReturn.paymentStatus === "failed"
                    ? "bg-red-200/70 text-red-900"
                    : "bg-amber-200/70 text-amber-900"
              }`}
            >
              {paymentReturn.paymentStatus === "paid"
                ? "Pagamento Aprovado"
                : paymentReturn.paymentStatus === "failed"
                  ? "Pagamento Não Concluído"
                  : "Aguardando Confirmação"}
            </span>

            <h2 className="font-black text-lg sm:text-xl">
              {paymentReturn.paymentStatus === "paid"
                ? `Pedido #${paymentReturn.orderId} pago e confirmado!`
                : paymentReturn.paymentStatus === "failed"
                  ? `Não foi possível confirmar o pagamento do Pedido #${paymentReturn.orderId}`
                  : `Pedido #${paymentReturn.orderId} aguardando confirmação do pagamento`}
            </h2>

            <p className="text-xs sm:text-sm mt-1 opacity-90">
              {paymentReturn.paymentStatus === "paid"
                ? `Recebemos seu pagamento na ${store.name}. Você acompanhará cada etapa do preparo pelo seu WhatsApp.`
                : paymentReturn.paymentStatus === "failed"
                  ? "Você pode tentar pagar novamente pelo botão abaixo ou fazer um novo pedido."
                  : "Se você pagou via PIX, a confirmação costuma levar alguns segundos. Assim que confirmar, avisaremos no seu WhatsApp."}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              {paymentReturn.paymentStatus !== "paid" &&
                paymentReturn.order && (
                  <button
                    type="button"
                    onClick={() => setActiveOnlineOrder(paymentReturn.order)}
                    className="px-4 py-1.5 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                  >
                    {paymentReturn.paymentStatus === "failed"
                      ? "Tentar pagar novamente"
                      : "Abrir pagamento"}
                  </button>
                )}

              {paymentReturn.paymentStatus !== "paid" && (
                <button
                  type="button"
                  disabled={checkingPayment}
                  onClick={() => verifyOrderPayment(paymentReturn.orderId)}
                  className="px-3.5 py-1.5 bg-white hover:bg-stone-100 disabled:opacity-50 text-zinc-900 text-xs font-bold rounded-xl border border-stone-300 transition cursor-pointer"
                >
                  {checkingPayment ? "Verificando..." : "Verificar pagamento"}
                </button>
              )}

              <button
                type="button"
                onClick={() => setPaymentReturn(null)}
                className="px-3.5 py-1.5 bg-white/80 hover:bg-white text-zinc-800 text-xs font-bold rounded-xl border border-stone-300 transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Pedido Confirmado */}
      {orderSuccess && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-5">
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 text-emerald-900 shadow-xs">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 text-xs font-extrabold mb-1.5">
                  Pedido Confirmado
                </span>
                <h2 className="font-black text-lg sm:text-xl">
                  Pedido #{orderSuccess.id} enviado para a cozinha!
                </h2>
                <p className="text-xs sm:text-sm text-emerald-800 mt-1">
                  Obrigado, <strong>{orderSuccess.customer_name}</strong>.{" "}
                  <strong>{store.name}</strong> já recebeu os itens do seu
                  pedido. Você receberá as atualizações de cada etapa no seu
                  WhatsApp.
                </p>
              </div>
            </div>
            <button
              onClick={() => setOrderSuccess(null)}
              className="mt-3.5 px-3.5 py-1.5 bg-white hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl border border-emerald-300 transition cursor-pointer"
            >
              Fazer outro pedido
            </button>
          </div>
        </div>
      )}

      {/* Barra Sticky de Categorias */}
      <div className="bg-white/95 backdrop-blur-md border-b border-stone-200/80 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#BC0202] text-white shadow-xs shadow-[#BC0202]/30"
                : "bg-stone-100 text-zinc-700 hover:bg-stone-200/80"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#BC0202] text-white shadow-xs shadow-[#BC0202]/30"
                  : "bg-stone-100 text-zinc-700 hover:bg-stone-200/80"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Produtos */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-3.5">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-10 text-center text-zinc-500 text-sm">
            Nenhum item disponível nesta categoria no momento.
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const qty = getItemQuantity(prod.id);
            const hasImage = prod.image_url && !brokenImages[prod.id];

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-4 shadow-2xs hover:shadow-md border border-stone-200/80 transition-shadow flex items-start gap-3.5 sm:gap-4"
              >
                {/* Foto à Esquerda */}
                {hasImage && (
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [prod.id]: true }))
                    }
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover border border-stone-100 bg-stone-50 shrink-0"
                  />
                )}

                {/* Informações e Ação */}
                <div className="flex-1 min-w-0 min-h-24 sm:min-h-28 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-zinc-900 leading-snug">
                      {prod.name}
                    </h3>
                    {prod.description && (
                      <p className="text-xs sm:text-sm text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Preço + Seletor */}
                  <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2">
                    <span className="font-black text-base sm:text-lg text-[#BC0202] whitespace-nowrap">
                      R$ {formatMoney(prod.price)}
                    </span>

                    <div className="shrink-0">
                      {!isOpen ? (
                        <button
                          disabled
                          className="h-9 px-3.5 bg-stone-100 text-zinc-400 text-xs font-bold rounded-xl border border-stone-200 cursor-not-allowed"
                        >
                          Indisponível
                        </button>
                      ) : qty > 0 ? (
                        <div className="h-9 inline-flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-2">
                          <button
                            onClick={() => decreaseQuantity(prod.id)}
                            aria-label="Diminuir quantidade"
                            className="w-6 h-6 rounded-lg hover:bg-red-100 text-[#BC0202] font-black flex items-center justify-center cursor-pointer transition"
                          >
                            −
                          </button>
                          <span className="text-xs sm:text-sm font-black text-zinc-900 min-w-4 text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => addToCart(prod)}
                            aria-label="Aumentar quantidade"
                            className="w-6 h-6 rounded-lg hover:bg-red-100 text-[#BC0202] font-black flex items-center justify-center cursor-pointer transition"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod)}
                          className="h-9 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] text-white text-xs sm:text-sm font-bold rounded-xl transition shadow-xs cursor-pointer"
                        >
                          + Adicionar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Barra Flutuante da Sacola */}
      {isOpen && totalItems > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-0 inset-x-0 px-3 sm:px-6 pb-3 sm:pb-4 pt-2 z-20 pointer-events-none">
          <div className="pointer-events-auto max-w-3xl mx-auto bg-zinc-900 text-white rounded-2xl px-4 sm:px-5 py-3.5 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="w-9 h-9 rounded-xl bg-[#BC0202] text-white font-black text-sm flex items-center justify-center shrink-0">
                {totalItems}
              </span>
              <div className="min-w-0">
                <span className="text-[11px] text-zinc-400 block">
                  Subtotal na sacola
                </span>
                <strong className="text-base sm:text-lg font-black tracking-tight">
                  R$ {formatMoney(subtotal)}
                </strong>
              </div>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-b from-[#DF0A0A] to-[#B00000] hover:from-[#C40404] hover:to-[#8F0000] text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shrink-0 shadow-md"
            >
              Ver Sacola e Finalizar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <div>
                <h2 className="text-lg font-black text-zinc-900">
                  Finalizar Pedido
                </h2>
                <p className="text-xs text-zinc-500">
                  Confira seus itens e escolha a entrega
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-zinc-600 font-bold text-sm flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {/* Resumo dos itens com ajuste rápido */}
            <div className="space-y-2.5 mb-4 pb-4 border-b border-stone-100 text-xs sm:text-sm">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-2.5 bg-stone-50 rounded-xl p-2.5 border border-stone-200/70"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {item.product.image_url &&
                      !brokenImages[item.product.id] && (
                        <img
                          src={item.product.image_url}
                          alt={item.product.name}
                          onError={() =>
                            setBrokenImages((prev) => ({
                              ...prev,
                              [item.product.id]: true,
                            }))
                          }
                          className="w-10 h-10 rounded-lg object-cover border border-stone-200 shrink-0"
                        />
                      )}
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-800 truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        R${" "}
                        {formatMoney(
                          Number(item.product.price) * item.quantity,
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-2 py-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        decreaseQuantity(item.product.id);
                        if (totalItems === 1) setIsCheckoutOpen(false);
                      }}
                      className="text-[#BC0202] font-black px-1 cursor-pointer"
                    >
                      −
                    </button>
                    <span className="font-bold text-zinc-900 min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(item.product)}
                      className="text-[#BC0202] font-black px-1 cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="pt-2 flex justify-between text-zinc-500">
                <span>Subtotal</span>
                <span>R$ {formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>Taxa de entrega</span>
                <span>
                  {deliveryType === "pickup" || deliveryFee === 0
                    ? "Grátis"
                    : `R$ ${formatMoney(deliveryFee)}`}
                </span>
              </div>

              <div className="flex justify-between text-base font-black text-zinc-900 pt-2 border-t border-dashed border-stone-200">
                <span>Total a pagar</span>
                <span className="text-[#BC0202]">
                  R$ {formatMoney(finalTotal)}
                </span>
              </div>
            </div>

            {orderError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {orderError}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2 p-1 bg-stone-100 rounded-xl border border-stone-200/80">
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                    deliveryType === "delivery"
                      ? "bg-white text-[#BC0202] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("pickup")}
                  className={`py-2 rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                    deliveryType === "pickup"
                      ? "bg-white text-[#BC0202] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Retirar no Local
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Seu Nome
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ex: João Silva"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="Ex: 34999999999"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                  />
                </div>
              </div>

              {deliveryType === "delivery" && (
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Endereço completo de entrega
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro e complemento"
                    className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                  />
                </div>
              )}

              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-zinc-700">
                  Forma de Pagamento
                </label>

                {hasOnlinePayment && (
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("online")}
                    className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between gap-2 ${
                      paymentMethod === "online"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20"
                        : "bg-white border-stone-300 text-zinc-800 hover:bg-stone-50"
                    }`}
                  >
                    <div>
                      <span className="block text-xs sm:text-sm font-extrabold">
                        Pagar Online Agora (
                        {store.mp_public_key ? "PIX ou Cartão" : "PIX"})
                      </span>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">
                        Direto aqui no site, sem sair da página
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                        paymentMethod === "online"
                          ? "bg-emerald-600 text-white"
                          : "bg-stone-100 text-zinc-600"
                      }`}
                    >
                      Rápido
                    </span>
                  </button>
                )}

                {hasOnlinePayment && (
                  <p className="text-[11px] font-semibold text-zinc-400 pt-0.5">
                    Ou pagar na{" "}
                    {deliveryType === "delivery" ? "entrega" : "retirada"}:
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "pix", label: "PIX" },
                    { id: "card", label: "Cartão" },
                    { id: "cash", label: "Dinheiro" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPaymentMethod(option.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                        paymentMethod === option.id
                          ? "bg-red-50 border-[#BC0202] text-[#830000]"
                          : "bg-white border-stone-300 text-zinc-700 hover:bg-stone-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Observações (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Tirar cebola, troco para R$ 50..."
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !isOpen}
                className="w-full py-3.5 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:bg-zinc-400 text-white text-sm sm:text-base font-bold rounded-xl transition cursor-pointer shadow-md shadow-[#BC0202]/20 mt-1"
              >
                {submitting
                  ? paymentMethod === "online"
                    ? "Preparando pagamento..."
                    : "Enviando pedido..."
                  : paymentMethod === "online"
                    ? `Pagar Agora • R$ ${formatMoney(finalTotal)}`
                    : `Confirmar Pedido • R$ ${formatMoney(finalTotal)}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Pagamento Transparente no Site (API Orders) */}
      {activeOnlineOrder && (
        <OnlinePaymentModal
          order={activeOnlineOrder}
          storeName={store.name}
          mpPublicKey={store.mp_public_key}
          onPaid={handleOnlinePaid}
          onClose={() => setActiveOnlineOrder(null)}
        />
      )}
    </div>
  );
}
