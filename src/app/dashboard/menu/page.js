"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function MenuManagementPage() {
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [categoryName, setCategoryName] = useState("");
  const [catError, setCatError] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [prodError, setProdError] = useState("");
  const [savingProduct, setSavingProduct] = useState(false);

  const [togglingId, setTogglingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [editingProduct, setEditingProduct] = useState(null);
  const [editName, setEditName] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    async function loadMenuData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/products"),
        ]);

        if (catRes.status === 401 || prodRes.status === 401) {
          router.push("/login");
          return;
        }

        const catData = await catRes.json();
        const prodData = await prodRes.json();

        const loadedCategories = catData.categories || [];
        setCategories(loadedCategories);
        setProducts(prodData.products || []);

        if (loadedCategories.length > 0) {
          setCategoryId(String(loadedCategories[0].id));
        }
      } catch (error) {
        console.error("Erro ao carregar cardápio:", error);
      } finally {
        setLoading(false);
      }
    }

    loadMenuData();
  }, [router]);

  async function handleCreateCategory(e) {
    e.preventDefault();
    setCatError("");
    setSavingCategory(true);

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: categoryName }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCatError(data.error || "Erro ao criar categoria.");
        setSavingCategory(false);
        return;
      }

      setCategories([...categories, data.category]);
      setCategoryName("");

      if (!categoryId) {
        setCategoryId(String(data.category.id));
      }
    } catch {
      setCatError("Erro de conexão com o servidor.");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleCreateProduct(e) {
    e.preventDefault();
    setProdError("");
    setSavingProduct(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: Number(categoryId),
          name: productName,
          description,
          price: Number(price),
          image_url: imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProdError(data.error || "Erro ao cadastrar produto.");
        setSavingProduct(false);
        return;
      }

      const selectedCategory = categories.find(
        (cat) => cat.id === Number(categoryId),
      );

      const createdProduct = {
        ...data.product,
        available: data.product.available !== false,
        has_orders: false,
        category_name: selectedCategory
          ? selectedCategory.name
          : "Sem categoria",
      };

      setProducts([...products, createdProduct]);

      setProductName("");
      setDescription("");
      setPrice("");
      setImageUrl("");
    } catch {
      setProdError("Erro de conexão com o servidor.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function handleToggleAvailability(product) {
    const isCurrentlyAvailable = product.available !== false;
    const nextAvailable = !isCurrentlyAvailable;

    setTogglingId(product.id);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: nextAvailable }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao atualizar disponibilidade.");
        return;
      }

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, available: nextAvailable } : item,
        ),
      );
    } catch {
      alert("Erro de conexão com o servidor.");
    } finally {
      setTogglingId(null);
    }
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setEditName(product.name || "");
    setEditCategoryId(
      String(product.category_id || (categories[0] ? categories[0].id : "")),
    );
    setEditDescription(product.description || "");
    setEditPrice(String(product.price ?? ""));
    setEditImageUrl(product.image_url || "");
    setEditError("");
  }

  async function handleUpdateProduct(e) {
    e.preventDefault();
    if (!editingProduct) return;

    setEditError("");
    setSavingEdit(true);

    try {
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: Number(editCategoryId),
          name: editName,
          description: editDescription,
          price: Number(editPrice),
          image_url: editImageUrl,
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (!response.ok) {
        setEditError(data.error || "Erro ao salvar alterações.");
        setSavingEdit(false);
        return;
      }

      const selectedCategory = categories.find(
        (cat) => cat.id === Number(editCategoryId),
      );

      setProducts((prev) =>
        prev.map((item) =>
          item.id === editingProduct.id
            ? {
                ...item,
                ...data.product,
                category_name:
                  data.product.category_name ??
                  selectedCategory?.name ??
                  item.category_name,
              }
            : item,
        ),
      );

      setEditingProduct(null);
    } catch {
      setEditError("Erro de conexão com o servidor.");
    } finally {
      setSavingEdit(false);
    }
  }

  // Produto com pedidos não pode ser excluído: oferece pausar o item.
  async function offerPauseInstead(product, message) {
    const isAvailable = product.available !== false;

    if (!isAvailable) {
      alert(`${message}\n\nEste item já está pausado no cardápio.`);
      return;
    }

    const shouldPause = window.confirm(
      `${message}\n\nDeseja pausar "${product.name}" agora?`,
    );
    if (shouldPause) {
      await handleToggleAvailability(product);
    }
  }

  async function handleDeleteProduct(product) {
    if (product.has_orders) {
      await offerPauseInstead(
        product,
        `"${product.name}" possui pedidos registrados e não pode ser excluído.`,
      );
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir "${product.name}"? Essa ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      if (response.status === 409 && data.code === "PRODUCT_HAS_ORDERS") {
        setProducts((prev) =>
          prev.map((item) =>
            item.id === product.id ? { ...item, has_orders: true } : item,
          ),
        );
        setDeletingId(null);
        await offerPauseInstead(product, data.error);
        return;
      }

      if (response.status === 404) {
        setProducts((prev) => prev.filter((item) => item.id !== product.id));
        alert(data.error || "Produto não encontrado.");
        return;
      }

      if (!response.ok) {
        alert(data.error || "Não foi possível excluir o produto.");
        return;
      }

      setProducts((prev) => prev.filter((item) => item.id !== product.id));
    } catch {
      alert("Erro de conexão com o servidor.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F7F5]">
        <div className="flex items-center gap-3 text-zinc-600 font-semibold text-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-[#BC0202] animate-ping" />
          Carregando cardápio...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F7F5]">
      <div className="h-1.5 bg-gradient-to-r from-[#BC0202] via-[#D90404] to-[#830000]" />

      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200/80 px-4 sm:px-6 py-3.5 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-12 sm:h-14 w-auto object-contain shrink-0 mix-blend-multiply"
            />
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black text-zinc-900 truncate tracking-tight">
                Cardápio Digital
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                Categorias, produtos e disponibilidade
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="px-3.5 sm:px-4 py-2 bg-stone-100 hover:bg-stone-200/80 text-zinc-800 text-xs sm:text-sm font-bold rounded-xl border border-stone-200 transition shrink-0"
          >
            Voltar ao Painel
          </Link>
        </div>

        <div className="max-w-6xl mx-auto mt-3 pt-3 border-t border-stone-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 transition whitespace-nowrap"
          >
            Visão Geral
          </Link>
          <Link
            href="/dashboard/orders"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-zinc-600 hover:text-zinc-900 hover:bg-stone-100 transition whitespace-nowrap"
          >
            Pedidos e Cozinha
          </Link>
          <Link
            href="/dashboard/menu"
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-[#BC0202] border border-red-200 whitespace-nowrap"
          >
            Cardápio Digital
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: Formulários */}
        <div className="space-y-6">
          {/* Card 1: Nova Categoria */}
          <div className="bg-white rounded-3xl shadow-2xs p-5 sm:p-6 border border-stone-200/80">
            <h2 className="text-base sm:text-lg font-black text-zinc-900 mb-4">
              Nova Categoria
            </h2>

            {catError && (
              <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {catError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: Lanches, Bebidas, Sobremesas"
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                />
              </div>

              <button
                type="submit"
                disabled={savingCategory}
                className="w-full py-2.5 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                {savingCategory ? "Salvando..." : "Adicionar Categoria"}
              </button>
            </form>

            {categories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <span className="text-xs font-semibold text-zinc-500 block mb-2">
                  Categorias cadastradas ({categories.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-3 py-1 bg-red-50 text-[#BC0202] border border-red-200 rounded-full text-xs font-bold"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Novo Produto */}
          <div className="bg-white rounded-3xl shadow-2xs p-5 sm:p-6 border border-stone-200/80">
            <h2 className="text-base sm:text-lg font-black text-zinc-900 mb-4">
              Novo Produto
            </h2>

            {categories.length === 0 ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 p-3.5 rounded-2xl">
                Crie pelo menos uma categoria acima antes de cadastrar produtos.
              </p>
            ) : (
              <>
                {prodError && (
                  <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    {prodError}
                  </div>
                )}

                <form onSubmit={handleCreateProduct} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                      Categoria
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                      Nome do Produto
                    </label>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Ex: X-Tudo Duplo"
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                      Descrição (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ingredientes, tamanho, acompanhamentos..."
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                      Preço (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="25.90"
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                      URL da Foto (opcional)
                    </label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202] transition"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="w-full py-2.5 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-xs"
                  >
                    {savingProduct ? "Cadastrando..." : "Salvar Produto"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>

        {/* COLUNA DIREITA: Lista de Produtos Cadastrados */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl shadow-2xs p-5 sm:p-6 border border-stone-200/80">
            <div className="flex items-center justify-between gap-2 mb-4">
              <h2 className="text-base sm:text-lg font-black text-zinc-900">
                Produtos no Cardápio
              </h2>
              <span className="px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-xs font-bold text-zinc-700">
                {products.length} {products.length === 1 ? "item" : "itens"}
              </span>
            </div>

            {products.length === 0 ? (
              <div className="text-center py-14 text-zinc-500 text-sm bg-[#F8F7F5] rounded-2xl border border-dashed border-stone-200">
                Nenhum produto cadastrado ainda. Use o formulário ao lado para
                adicionar o primeiro item.
              </div>
            ) : (
              <div className="divide-y divide-stone-100">
                {products.map((prod) => {
                  const isAvailable = prod.available !== false;
                  const isToggling = togglingId === prod.id;
                  const isDeleting = deletingId === prod.id;

                  return (
                    <div
                      key={prod.id}
                      className={`py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 transition ${
                        !isAvailable ? "opacity-65" : ""
                      }`}
                    >
                      <div className="flex items-start gap-3.5 min-w-0 flex-1">
                        {prod.image_url && (
                          <img
                            src={prod.image_url}
                            alt={prod.name}
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                            className="w-16 h-16 rounded-2xl object-cover border border-stone-200/80 bg-stone-50 shrink-0"
                          />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-bold text-zinc-900">
                              {prod.name}
                            </h3>
                            <span className="px-2.5 py-0.5 bg-stone-100 text-zinc-700 border border-stone-200 rounded-md text-xs font-semibold">
                              {prod.category_name}
                            </span>
                            {!isAvailable && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-md text-xs font-bold">
                                Pausado / Esgotado
                              </span>
                            )}
                            {prod.has_orders && (
                              <span
                                title="Este produto já aparece em pedidos e não pode ser excluído."
                                className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold"
                              >
                                Possui pedidos
                              </span>
                            )}
                          </div>

                          {prod.description && (
                            <p className="text-xs sm:text-sm text-zinc-500 mt-1 line-clamp-2">
                              {prod.description}
                            </p>
                          )}

                          <p className="font-black text-sm sm:text-base text-[#BC0202] mt-1.5">
                            R$ {Number(prod.price).toFixed(2).replace(".", ",")}
                          </p>
                        </div>
                      </div>

                      {/* Ações do Produto */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                        <button
                          type="button"
                          disabled={isToggling}
                          onClick={() => handleToggleAvailability(prod)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                            isAvailable
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100"
                          }`}
                        >
                          {isToggling
                            ? "..."
                            : isAvailable
                              ? "Disponível"
                              : "Ativar Item"}
                        </button>

                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200/80 text-zinc-700 text-xs font-bold rounded-xl border border-stone-200 transition cursor-pointer"
                        >
                          Editar
                        </button>

                        <button
                          type="button"
                          disabled={isDeleting || isToggling}
                          onClick={() => handleDeleteProduct(prod)}
                          title={
                            prod.has_orders
                              ? "Produto com pedidos registrados não pode ser excluído. Clique para pausá-lo."
                              : "Excluir produto"
                          }
                          className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition cursor-pointer disabled:opacity-50 ${
                            prod.has_orders
                              ? "bg-stone-50 text-zinc-400 border-stone-200 hover:bg-stone-100"
                              : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {isDeleting ? "..." : "Excluir"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* MODAL DE EDIÇÃO DE PRODUTO */}
      {editingProduct && (
        <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5 mb-4">
              <h2 className="text-lg font-black text-zinc-900">
                Editar Produto
              </h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-zinc-600 font-bold text-sm flex items-center justify-center cursor-pointer transition"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="mb-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateProduct} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Categoria
                </label>
                <select
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Nome do Produto
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Descrição (opcional)
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  Preço (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-zinc-700 mb-1.5">
                  URL da Foto (opcional)
                </label>
                <input
                  type="text"
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-stone-50/70 focus:bg-white border border-stone-300 rounded-xl text-base sm:text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#BC0202]/25 focus:border-[#BC0202]"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200/80 text-zinc-700 text-sm font-bold rounded-xl border border-stone-200 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-b from-[#CF0606] to-[#A80000] hover:from-[#B00000] hover:to-[#830000] disabled:opacity-60 text-white text-sm font-bold rounded-xl transition cursor-pointer shadow-xs"
                >
                  {savingEdit ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
