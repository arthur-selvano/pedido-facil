import { Suspense } from "react";
import { notFound } from "next/navigation";
import { query } from "@/lib/db";
import StoreMenu from "../components/StoreMenu";

async function StoreLoader({ params }) {
  const { slug } = await params;

  const storeResult = await query(
    "SELECT id, name, slug, phone, delivery_fee FROM stores WHERE slug = $1",
    [slug.toLowerCase()],
  );

  if (storeResult.rows.length === 0) {
    notFound();
  }

  const store = storeResult.rows[0];

  const [categoriesResult, productsResult] = await Promise.all([
    query(
      "SELECT id, name FROM categories WHERE store_id = $1 ORDER BY id ASC",
      [store.id],
    ),
    query(
      `SELECT id, category_id, name, description, price, image_url
       FROM products
       WHERE store_id = $1 AND available = TRUE
       ORDER BY id ASC`,
      [store.id],
    ),
  ]);

  return (
    <StoreMenu
      store={store}
      categories={categoriesResult.rows}
      products={productsResult.rows}
    />
  );
}

export default function PublicStorePage({ params }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <p className="text-gray-600 font-medium">Carregando cardápio...</p>
        </div>
      }
    >
      <StoreLoader params={params} />
    </Suspense>
  );
}
