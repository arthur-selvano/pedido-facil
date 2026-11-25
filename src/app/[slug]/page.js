import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import StoreMenu from "../components/StoreMenu";

async function StoreLoader({ params }) {
  const { slug } = await params;

  const storeData = await prisma.stores.findFirst({
    where: { slug: slug.toLowerCase() },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      delivery_fee: true,
      is_open: true,
    },
  });

  if (!storeData) {
    notFound();
  }

  const [categories, productsData] = await Promise.all([
    prisma.categories.findMany({
      where: { store_id: storeData.id },
      select: { id: true, name: true },
      orderBy: { id: "asc" },
    }),
    prisma.products.findMany({
      where: {
        store_id: storeData.id,
        available: true,
      },
      select: {
        id: true,
        category_id: true,
        name: true,
        description: true,
        price: true,
        image_url: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const store = {
    ...storeData,
    delivery_fee: Number(storeData.delivery_fee || 0),
  };

  const products = productsData.map((product) => ({
    ...product,
    price: Number(product.price),
  }));

  return (
    <StoreMenu store={store} categories={categories} products={products} />
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
