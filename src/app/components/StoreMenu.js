"use client";

import { useState } from "react";

export default function StoreMenu({ store, categories, products }) {
  const [selectedCategory, setSelectedCategory] = useState("all");

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

  const deliveryFee = Number(store.delivery_fee) || 0;

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category_id === selectedCategory);

  function addToCart(product) {
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
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo Pedido Fácil"
            className="h-25 w-auto object-contain"
          />
          <div>
            <h1 className="text-xl font-bold text-gray-800">{store.name}</h1>
            <div className="flex flex-wrap gap-x-4 text-sm text-gray-500">
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
      </header>

      {/* Banner de Pedido Confirmado */}
      {orderSuccess && (
        <div className="max-w-3xl mx-auto px-6 mt-6">
          <div className="bg-green-50 border border-green-300 rounded-xl p-5 text-green-800">
            <h2 className="font-bold text-lg">
              Pedido #{orderSuccess.id} recebido com sucesso!
            </h2>
            <p className="text-sm mt-1">
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
        <div className="max-w-3xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition cursor-pointer ${
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
      <main className="max-w-3xl mx-auto px-6 py-6 space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-500 text-sm">
            Nenhum item disponível nesta categoria.
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const qty = getItemQuantity(prod.id);

            return (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-4 shadow-md border border-gray-200 flex items-center justify-between gap-4"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{prod.name}</h3>
                  {prod.description && (
                    <p className="text-sm text-gray-500 mt-1">
                      {prod.description}
                    </p>
                  )}
                  <p className="font-bold text-[#BC0202] mt-2">
                    R$ {Number(prod.price).toFixed(2).replace(".", ",")}
                  </p>
                </div>

                {/* Controles + e - */}
                <div className="flex items-center gap-2">
                  {qty > 0 ? (
                    <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                      <button
                        onClick={() => decreaseQuantity(prod.id)}
                        className="text-[#BC0202] font-bold px-1.5 cursor-pointer"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold text-gray-800">
                        {qty}
                      </span>
                      <button
                        onClick={() => addToCart(prod)}
                        className="text-[#BC0202] font-bold px-1.5 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(prod)}
                      className="px-4 py-2 bg-[#BC0202] hover:bg-[#830000] text-white text-sm font-semibold rounded-lg transition cursor-pointer"
                    >
                      Adicionar
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Barra Flutuante Inferior do Carrinho */}
      {totalItems > 0 && !isCheckoutOpen && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 block">
                {totalItems} {totalItems === 1 ? "item" : "itens"} na sacola
              </span>
              <strong className="text-lg text-gray-800">
                R$ {subtotal.toFixed(2).replace(".", ",")}
              </strong>
            </div>

            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="px-6 py-3 bg-[#BC0202] hover:bg-[#830000] text-white font-semibold rounded-xl transition cursor-pointer"
            >
              Ver Sacola e Finalizar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Checkout */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h2 className="text-lg font-bold text-gray-800">Seu Pedido</h2>
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                X
              </button>
            </div>

            {/* Resumo dos itens */}
            <div className="space-y-2 mb-4 pb-4 border-b border-gray-100 text-sm">
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center justify-between"
                >
                  <span className="text-gray-700">
                    {item.quantity}x {item.product.name}
                  </span>
                  <span className="font-medium text-gray-800">
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

              <div className="flex justify-between text-base font-bold text-gray-800 pt-1">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  WhatsApp para contato
                </label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Ex: 34999999999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDeliveryType("delivery")}
                  className={`py-2 rounded-lg text-sm font-medium border cursor-pointer ${
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
                  className={`py-2 rounded-lg text-sm font-medium border cursor-pointer ${
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202] bg-white"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-[#BC0202] hover:bg-[#830000] disabled:bg-[#830000] text-white font-bold rounded-xl transition cursor-pointer mt-2"
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
