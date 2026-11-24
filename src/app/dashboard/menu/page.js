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
    } catch (error) {
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
        category_name: selectedCategory
          ? selectedCategory.name
          : "Sem categoria",
      };

      setProducts([...products, createdProduct]);

      setProductName("");
      setDescription("");
      setPrice("");
      setImageUrl("");
    } catch (error) {
      setProdError("Erro de conexão com o servidor.");
    } finally {
      setSavingProduct(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600 font-medium">Carregando cardápio...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Logo Pedido Fácil"
              className="h-25 w-auto object-contain"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Gerenciar Cardápio
              </h1>
              <p className="text-sm text-gray-500">
                Organize suas categorias e cadastre os itens da loja
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition"
          >
            Voltar ao Painel
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLUNA ESQUERDA: Formulários */}
        <div className="space-y-6">
          {/* Card 1: Nova Categoria */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Nova Categoria
            </h2>

            {catError && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                {catError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ex: Lanches, Bebidas, Sobremesas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                />
              </div>

              <button
                type="submit"
                disabled={savingCategory}
                className="w-full py-2 px-4 bg-[#BC0202] hover:bg-[#830000] disabled:bg-[#830000] text-white text-sm font-bold rounded-xl transition cursor-pointer"
              >
                {savingCategory ? "Salvando..." : "Adicionar Categoria"}
              </button>
            </form>

            {/* Tags das categorias existentes */}
            {categories.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <span className="text-xs font-medium text-gray-500 block mb-2">
                  Categorias cadastradas ({categories.length}):
                </span>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2.5 py-1 bg-red-50 text-[#BC0202] border border-red-200 rounded-full text-xs font-bold"
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Novo Produto */}
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Novo Produto
            </h2>

            {categories.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 p-3 rounded-lg">
                Crie pelo menos uma categoria acima antes de cadastrar produtos.
              </p>
            ) : (
              <>
                {prodError && (
                  <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs">
                    {prodError}
                  </div>
                )}

                <form onSubmit={handleCreateProduct} className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Categoria
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Nome do Produto
                    </label>
                    <input
                      type="text"
                      required
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Ex: X-Tudo Duplo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      Descrição (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ingredientes, tamanho, acompanhamentos..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      URL da Foto (opcional)
                    </label>
                    <input
                      type="text"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BC0202]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingProduct}
                    className="w-full py-2.5 px-4 bg-[#BC0202] hover:bg-[#830000] disabled:bg-[#830000] text-white text-sm font-bold rounded-xl transition cursor-pointer"
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
          <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Produtos no Cardápio ({products.length})
            </h2>

            {products.length === 0 ? (
              <div className="text-center py-12 text-gray-500 text-sm">
                Nenhum produto cadastrado ainda. Use o formulário ao lado para
                adicionar o primeiro item.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {products.map((prod) => (
                  <div
                    key={prod.id}
                    className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">
                          {prod.name}
                        </h3>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                          {prod.category_name}
                        </span>
                      </div>
                      {prod.description && (
                        <p className="text-sm text-gray-500 mt-1">
                          {prod.description}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-bold text-[#BC0202]">
                        R$ {Number(prod.price).toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
