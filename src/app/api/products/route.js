import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const store = await prisma.stores.findFirst({
      where: { user_id: decoded.userId },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const rawProducts = await prisma.products.findMany({
      where: { store_id: store.id },
      orderBy: { id: "asc" },
      include: {
        categories: {
          select: { name: true },
        },
      },
    });

    const products = rawProducts.map(({ categories, ...product }) => ({
      ...product,
      category_name: categories.name,
    }));

    return NextResponse.json({ products });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const store = await prisma.stores.findFirst({
      where: { user_id: decoded.userId },
      select: { id: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const { category_id, name, description, price, image_url } =
      await request.json();

    const categoryId = Number(category_id);

    if (
      !category_id ||
      isNaN(categoryId) ||
      !name ||
      !name.trim() ||
      price === undefined ||
      price === null ||
      price === "" ||
      isNaN(Number(price)) ||
      Number(price) < 0
    ) {
      return NextResponse.json(
        { error: "Falta preencher campos obrigatórios ou o preço é inválido!" },
        { status: 400 },
      );
    }

    const categoryCheck = await prisma.categories.findFirst({
      where: {
        id: categoryId,
        store_id: store.id,
      },
      select: { id: true },
    });

    if (!categoryCheck) {
      return NextResponse.json(
        { error: "Categoria inválida ou não pertence à sua loja." },
        { status: 400 },
      );
    }

    const newProduct = await prisma.products.create({
      data: {
        store_id: store.id,
        category_id: categoryId,
        name: name.trim(),
        description: description || null,
        price: Number(price),
        image_url: image_url || null,
      },
    });

    return NextResponse.json({ product: newProduct }, { status: 201 });
  } catch (error) {
    console.error("Erro ao cadastrar produto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
