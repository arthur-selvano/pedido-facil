"use client";

import { useState, useEffect, useMemo } from "react";

function formatMoney(value) {
  return Number(value || 0)
    .toFixed(2)
    .replace(".", ",");
}

export default function PdvOrderModal({
  isOpen,
  store,
  onClose,
  onOrderCreated,
}) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState([]);

  const [deliveryType, setDeliveryType] = useState("counter");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [changeFor, setChangeFor] = useState("");
  const [isPaid, setIsPaid] = useState(true);
  const [initialStatus, setInitialStatus] = useState("preparing");
  const [notes, setNotes] = useState("");
  const [printAfterCreate, setPrintAfterCreate] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let ignore = false;

    async function loadCatalog() {
      setLoadingCatalog(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
        ]);

        if (ignore) return;

        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
        }
        if (catRes.ok) {
          const catData = await catRes.json();
          setCategories(catData.categories || []);
        }
      } catch (err) {
        console.error("Erro ao carregar cardápio no PDV:", err);
      } finally {
        if (!ignore) setLoadingCatalog(false);
      }
    }

    loadCatalog();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (
        selectedCategory !== "all" &&
        String(p.category_id) !== String(selectedCategory)
      ) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategory, search]);

  const subtotal = useMemo(
    () =>
      cart.reduce(
        (acc, item) => acc + Number(item.product.price) * item.quantity,
        0,
      ),
    [cart],
  );

  const deliveryFee =
    deliveryType === "delivery" ? Number(store?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  const parsedChangeFor =
    paymentMethod === "cash" && changeFor.trim() !== ""
      ? Number(changeFor.replace(",", "."))
      : null;
  const changeAmount =
    parsedChangeFor !== null &&
    Number.isFinite(parsedChangeFor) &&
    parsedChangeFor >= total
      ? parsedChangeFor - total
      : null;

  if (!isOpen) return null;

  function addItem(product) {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx > -1) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function decreaseItem(productId) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i,
        )
        .filter((i) => i.quantity > 0),
    );
  }

  function getQty(productId) {
    return cart.find((i) => i.product.id === productId)?.quantity || 0;
  }

  function resetForm() {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setAddress("");
    setChangeFor("");
    setNotes("");
    setError("");
    setDeliveryType("counter");
    setPaymentMethod("cash");
    setIsPaid(true);
    setInitialStatus("preparing");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (cart.length === 0) {
      setError("Selecione ao menos um produto para lançar o pedido.");
      return;
    }

    if (deliveryType === "delivery" && !address.trim()) {
      setError("Informe o endereço para pedidos de entrega.");
      return;
    }

    if (
      paymentMethod === "cash" &&
      changeFor.trim() !== "" &&
      (!Number.isFinite(parsedChangeFor) || parsedChangeFor < total)
    ) {
      setError("O valor para troco deve ser maior ou igual ao total.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/orders/pdv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          delivery_type: deliveryType,
          address: deliveryType === "delivery" ? address : null,
          payment_method: paymentMethod,
          payment_status: isPaid ? "paid" : "unpaid",
          change_for:
            paymentMethod === "cash" && changeFor.trim() !== ""
              ? parsedChangeFor
              : null,
          status: initialStatus,
          notes,
          items: cart.map((i) => ({
            product_id: i.product.id,
            quantity: i.quantity,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Não foi possível registrar o pedido.");
        return;
      }

      onOrderCreated(data.order, printAfterCreate);
      resetForm();
      onClose();
    } catch {
      setError("Erro de conexão ao registrar pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs p-3 sm:p-5"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[94vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="px-5 py-4 border-b border-stone-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              Novo Pedido — PDV (Balcão / Telefone)
            </h2>
            <p className="text-xs text-zinc-500">
              Lance pedidos presenciais ou por telefone e imprima a comanda na
              hora.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-stone-100 hover:bg-stone-200 text-zinc-700 font-bold text-sm transition cursor-pointer"
            aria-label="Fechar PDV"
          >
            ✕
          </button>
        </div>

        {/* Corpo dividido: Catálogo à esquerda, Resumo/Checkout à direita */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
          {/* Coluna Esquerda: Produtos */}
          <div className="lg:col-span-7 p-4 sm:p-5 flex flex-col gap-3 bg-[#F8F7F5]">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto pelo nome..."
                className="flex-1 px-3.5 py-2 bg-white border border-stone-300 rounded-xl text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
              />
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory("all")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === "all"
                      ? "bg-zinc-900 text-white"
                      : "bg-white text-zinc-600 border border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  Todos
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(String(cat.id))}
                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                      String(selectedCategory) === String(cat.id)
                        ? "bg-zinc-900 text-white"
                        : "bg-white text-zinc-600 border border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {loadingCatalog ? (
              <p className="text-xs text-zinc-500 py-8 text-center font-semibold">
                Carregando produtos...
              </p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-xs text-zinc-500 py-8 text-center font-semibold">
                Nenhum produto encontrado.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto max-h-[52vh] pr-1">
                {filteredProducts.map((product) => {
                  const qty = getQty(product.id);
                  return (
                    <div
                      key={product.id}
                      className={`p-3 rounded-2xl border bg-white flex items-center justify-between gap-2 transition ${
                        qty > 0
                          ? "border-[#BC0202] ring-1 ring-[#BC0202]/20"
                          : "border-stone-200/90 hover:border-stone-300"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-zinc-900 truncate">
                          {product.name}
                        </p>
                        <p className="text-xs font-extrabold text-[#BC0202] mt-0.5">
                          R$ {formatMoney(product.price)}
                          {product.available === false && (
                            <span className="ml-1.5 text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Pausado
                            </span>
                          )}
                        </p>
                      </div>

                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => addItem(product)}
                          className="px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-[#BC0202] hover:text-white text-zinc-800 text-xs font-extrabold transition cursor-pointer shrink-0"
                        >
                          + Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-xl px-1.5 py-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => decreaseItem(product.id)}
                            className="w-6 h-6 rounded-lg bg-white text-[#BC0202] font-black text-xs cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-xs font-black text-zinc-900 min-w-4 text-center">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => addItem(product)}
                            className="w-6 h-6 rounded-lg bg-[#BC0202] text-white font-black text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Coluna Direita: Dados do Pedido e Pagamento */}
          <form
            onSubmit={handleSubmit}
            className="lg:col-span-5 p-4 sm:p-5 flex flex-col gap-3.5 bg-white"
          >
            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            {/* Resumo dos itens */}
            <div className="bg-[#F8F7F5] rounded-2xl border border-stone-200/80 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                  Itens ({cart.reduce((a, i) => a + i.quantity, 0)})
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-[11px] font-bold text-zinc-500 hover:text-red-600 cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="text-xs text-zinc-400 py-2">
                  Clique nos produtos ao lado para montar o pedido.
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-32 overflow-y-auto text-xs">
                  {cart.map((item) => (
                    <li
                      key={item.product.id}
                      className="flex items-center justify-between gap-2 text-zinc-800"
                    >
                      <span className="truncate">
                        <strong className="text-[#BC0202]">
                          {item.quantity}x
                        </strong>{" "}
                        {item.product.name}
                      </span>
                      <span className="font-bold shrink-0">
                        R${" "}
                        {formatMoney(
                          Number(item.product.price) * item.quantity,
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pt-2 border-t border-dashed border-stone-300 space-y-0.5 text-xs">
                {deliveryType === "delivery" && deliveryFee > 0 && (
                  <div className="flex justify-between text-zinc-500">
                    <span>Taxa de entrega</span>
                    <span>R$ {formatMoney(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-zinc-900">
                  <span>Total</span>
                  <span className="text-[#BC0202]">
                    R$ {formatMoney(total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modalidade */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-stone-100 rounded-xl border border-stone-200/80">
              {[
                { id: "counter", label: "Balcão / Mesa" },
                { id: "pickup", label: "Retirada" },
                { id: "delivery", label: "Entrega" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setDeliveryType(opt.id);
                    setIsPaid(opt.id === "counter");
                  }}
                  className={`py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    deliveryType === opt.id
                      ? "bg-white text-[#BC0202] shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Cliente */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                  Nome / Mesa (opcional)
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Cliente Balcão"
                  className="w-full px-3 py-2 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#BC0202]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                  WhatsApp (opcional)
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="34999999999"
                  className="w-full px-3 py-2 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#BC0202]"
                />
              </div>
            </div>

            {deliveryType === "delivery" && (
              <div>
                <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                  Endereço de entrega *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro..."
                  className="w-full px-3 py-2 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#BC0202]"
                />
              </div>
            )}

            {/* Pagamento */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-zinc-600">
                Forma de Pagamento
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: "cash", label: "Dinheiro" },
                  { id: "pix", label: "PIX" },
                  { id: "debit_card", label: "Débito" },
                  { id: "credit_card", label: "Crédito" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPaymentMethod(opt.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                      paymentMethod === opt.id
                        ? "bg-red-50 border-[#BC0202] text-[#830000]"
                        : "bg-white border-stone-300 text-zinc-700 hover:bg-stone-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {paymentMethod === "cash" && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-[11px] font-bold text-amber-950">
                      Troco para (R$):
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={changeFor}
                      onChange={(e) => setChangeFor(e.target.value)}
                      placeholder="Ex: 50,00"
                      className="w-28 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-zinc-900 focus:outline-none focus:border-[#BC0202]"
                    />
                  </div>
                  {changeAmount !== null && (
                    <p className="text-[11px] font-extrabold text-emerald-700 text-right">
                      Troco a devolver: R$ {formatMoney(changeAmount)}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <label className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPaid}
                    onChange={(e) => setIsPaid(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                  />
                  Já recebido (Pago)
                </label>

                <select
                  aria-label="Status inicial do pedido"
                  value={initialStatus}
                  onChange={(e) => setInitialStatus(e.target.value)}
                  className="px-2.5 py-1 rounded-lg border border-stone-200 bg-stone-50 text-xs font-bold text-zinc-800 cursor-pointer"
                >
                  <option value="preparing">Enviar p/ Cozinha</option>
                  <option value="delivered">Já Concluído</option>
                  <option value="pending">Deixar Pendente</option>
                </select>
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-[11px] font-bold text-zinc-600 mb-1">
                Observações (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Mesa 4, sem cebola, ponto da carne..."
                className="w-full px-3 py-2 bg-stone-50 focus:bg-white border border-stone-300 rounded-xl text-xs text-zinc-900 focus:outline-none focus:border-[#BC0202]"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={printAfterCreate}
                onChange={(e) => setPrintAfterCreate(e.target.checked)}
                className="w-4 h-4 accent-[#BC0202] rounded cursor-pointer"
              />
              Imprimir comanda térmica ao finalizar
            </label>

            <button
              type="submit"
              disabled={submitting || cart.length === 0}
              className="w-full py-3 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-50 text-white text-sm font-black rounded-xl transition shadow-sm cursor-pointer mt-auto"
            >
              {submitting
                ? "Registrando..."
                : `Lançar Pedido • R$ ${formatMoney(total)}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
