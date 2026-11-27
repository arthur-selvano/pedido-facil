import { Suspense } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  hasOnlinePaymentEnabled,
  resolveMercadoPagoPublicKey,
} from "@/lib/mercadopago";
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
      mp_access_token: true,
      mp_public_key: true,
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

  const { mp_access_token, mp_public_key, ...publicStoreData } = storeData;
  const store = {
    ...publicStoreData,
    delivery_fee: Number(publicStoreData.delivery_fee || 0),
    has_online_payment: hasOnlinePaymentEnabled({ mp_access_token }),
    mp_public_key: resolveMercadoPagoPublicKey({ mp_public_key }),
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
        <div className="min-h-screen bg-[#F8F7F5]">
          <div className="h-1.5 bg-gradient-to-r from-[#BC0202] to-[#830000]" />
          <div className="bg-white border-b border-stone-200/80 px-4 sm:px-6 py-6">
            <div className="max-w-3xl mx-auto flex items-center gap-4 animate-pulse">
              <div className="w-16 h-16 rounded-2xl bg-stone-200 shrink-0" />
              <div className="space-y-2.5 flex-1">
                <div className="h-5 w-48 bg-stone-200 rounded-lg" />
                <div className="h-3.5 w-36 bg-stone-100 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-3 animate-pulse">
            <div className="h-28 bg-white rounded-2xl border border-stone-200/70" />
            <div className="h-28 bg-white rounded-2xl border border-stone-200/70" />
            <div className="h-28 bg-white rounded-2xl border border-stone-200/70" />
          </div>
        </div>
      }
    >
      <StoreLoader params={params} />
    </Suspense>
  );
}
