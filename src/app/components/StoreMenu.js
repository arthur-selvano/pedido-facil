"use client";

import { useState } from "react";

export default function StoreMenu({ store, categories, products }) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [brokenImages, setBrokenImages] = useState({});

  const [cart, setCart] = useState([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryType, setDeliveryType] = useState("delivery");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(null);

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

      setOrderSuccess(data.order);
      setCart([]);
      setIsCheckoutOpen(false);
    } catch (error) {
      setOrderError("Erro de conexão ao enviar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-28">
      {/* Cabeçalho da Loja */}
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-16 sm:h-24 w-auto object-contain shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-gray-800 leading-tight">
                  {store.name}
                </h1>
                <span
                  className={`px-2.5 py-0.5 text-xs font-bold rounded-full border shrink-0 ${
                    isOpen
                      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                      : "bg-red-50 text-red-700 border-red-300"
                  }`}
                >
                  {isOpen ? "Aberta" : "Fechada"}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs sm:text-sm text-gray-500 mt-1">
                <span>
                  Taxa de entrega:{" "}
                  {deliveryFee === 0
                    ? "Grátis"
                    : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`}
                </span>
                {store.phone && <span>WhatsApp: {store.phone}</span>}
              </div>
            </div>
          </div>

          {!isOpen && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3.5 sm:p-4 text-red-800">
              <h2 className="font-bold text-sm sm:text-base">
                Loja fechada no momento
              </h2>
              <p className="text-xs sm:text-sm text-red-700 mt-0.5">
                Você pode navegar pelo cardápio normalmente, mas não estamos
                recebendo novos pedidos agora.
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Banner de Pedido Confirmado */}
      {orderSuccess && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 mt-4 sm:mt-6">
          <div className="bg-green-50 border border-green-300 rounded-xl p-4 sm:p-5 text-green-800">
            <h2 className="font-bold text-base sm:text-lg">
              Pedido #{orderSuccess.id} recebido com sucesso!
            </h2>
            <p className="text-xs sm:text-sm mt-1">
              Obrigado, <strong>{orderSuccess.customer_name}</strong>. Seu
              pedido já foi enviado para a cozinha de{" "}
              <strong>{store.name}</strong>.
            </p>
            <button
              onClick={() => setOrderSuccess(null)}
              className="mt-3 text-xs font-semibold underline cursor-pointer"
            >
              Fazer outro pedido
            </button>
          </div>
        </div>
      )}

      {/* Barra de Categorias */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
              selectedCategory === "all"
                ? "bg-[#BC0202] text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat.id
                  ? "bg-[#BC0202] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de Produtos */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-3 sm:space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm">
            Nenhum item disponível nesta categoria.
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const qty = getItemQuantity(prod.id);
            const hasImage = prod.image_url && !brokenImages[prod.id];

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-3.5 sm:p-4 shadow-sm border border-gray-200 flex items-start gap-3.5 sm:gap-4"
              >
                {/* Foto à Esquerda */}
                {hasImage && (
                  <img
                    src={prod.image_url}
                    alt={prod.name}
                    onError={() =>
                      setBrokenImages((prev) => ({ ...prev, [prod.id]: true }))
                    }
                    className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover border border-gray-100 bg-gray-50 shrink-0"
                  />
                )}

                {/* Informações e Ação */}
                <div className="flex-1 min-w-0 min-h-24 sm:min-h-28 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-gray-900 leading-snug">
                      {prod.name}
                    </h3>
                    {prod.description && (
                      <p className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  {/* Linha Inferior Alinhada: Preço + Botão */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="font-extrabold text-sm sm:text-base text-[#BC0202] whitespace-nowrap">
                      R$ {Number(prod.price).toFixed(2).replace(".", ",")}
                    </span>

                    <div className="shrink-0">
                      {!isOpen ? (
                        <button
                          disabled
                          className="h-8 sm:h-9 px-3.5 bg-gray-200 text-gray-500 text-xs sm:text-sm font-semibold rounded-lg cursor-not-allowed"
                        >
                          Fechado
                        </button>
                      ) : qty > 0 ? (
                        <div className="h-8 sm:h-9 inline-flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-lg px-2.5">
                          <button
                            onClick={() => decreaseQuantity(prod.id)}
                            className="text-[#BC0202] font-bold px-1 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="text-xs sm:text-sm font-bold text-gray-900 min-w-4 text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => addToCart(prod)}
                            className="text-[#BC0202] font-bold px-1 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(prod)}
                          className="h-8 sm:h-9 px-4 bg-[#BC0202] hover:bg-[#830000] text-white text-xs sm:text-sm font-semibold rounded-lg transition cursor-pointer"
                        >
                          Adicionar
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

      {/* Barra Flutuante Inferior do Carrinho */}
      {isOpen && totalItems > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-3.5 sm:py-4 shadow-lg z-20">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div>
              <span className="text-xs text-gray-500 block">
                {totalItems} {totalItems === 1 ? "item" : "itens"} na sacola
              </span>
              <strong className="text-base sm:text-lg text-gray-800">
                R$ {subtotal.toFixed(2).replace(".", ",")}
              </strong>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-[#BC0202] hover:bg-[#830000] text-white text-sm sm:text-base font-semibold rounded-xl transition cursor-pointer"
            >
              Ver Sacola e Finalizar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-base sm:text-lg font-bold text-gray-800">
                Seu Pedido
              </h2>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2 cursor-pointer"
              >
                X
              </button>
            </div>

            {/* Resumo dos itens */}
            <div className="space-y-2.5 mb-4 pb-4 border-b border-gray-100 text-xs sm:text-sm">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between gap-2.5"
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
                          className="w-10 h-10 rounded-lg object-cover border border-gray-100 shrink-0"
                        />
                      )}
                    <span className="text-gray-700 truncate">
                      {item.quantity}x {item.product.name}
                    </span>
                  </div>
                  <span className="font-medium text-gray-800 shrink-0">
                    R${" "}
                    {(Number(item.product.price) * item.quantity)
                      .toFixed(2)
                      .replace(".", ",")}
                  </span>
                </div>
              ))}

              <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between text-gray-500">
                <span>Taxa de entrega</span>
                <span>
                  {deliveryType === "pickup" || deliveryFee === 0
                    ? "Grátis"
                    : `R$ ${deliveryFee.toFixed(2).replace(".", ",")}`}
                </span>
              </div>

              <div className="flex justify-between text-sm sm:text-base font-bold text-gray-800 pt-1">
                <span>Total</span>
                <span>R$ {finalTotal.toFixed(2).replace(".", ",")}</span>
              </div>
            </div>

            {orderError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                {orderError}
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Seu Nome
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  WhatsApp para contato
                </label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ex: 34999999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  className={`py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border cursor-pointer ${
                    deliveryType === "delivery"
                      ? "bg-red-50 border-[#BC0202] text-[#830000]"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  Entrega
                </button>
                <button
                  type="button"
                  onClick={() => setDeliveryType("pickup")}
                  className={`py-2.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium border cursor-pointer ${
                    deliveryType === "pickup"
                      ? "bg-red-50 border-[#BC0202] text-[#830000]"
                      : "border-gray-300 text-gray-600"
                  }`}
                >
                  Retirar no Local
                </button>
              </div>

              {deliveryType === "delivery" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Endereço completo
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rua, número, bairro e complemento"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202] bg-white"
                >
                  <option value="pix">PIX</option>
                  <option value="card">Cartão na entrega</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Observações (opcional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Tirar cebola, troco para R$ 50..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base sm:text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !isOpen}
                className="w-full py-3 bg-[#BC0202] hover:bg-[#830000] disabled:bg-gray-400 text-white text-sm sm:text-base font-bold rounded-xl transition cursor-pointer mt-2"
              >
                {submitting ? "Enviando pedido..." : "Confirmar Pedido"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
