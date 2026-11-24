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

    const categories = await prisma.categories.findMany({
      where: { store_id: store.id },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Erro ao listar categorias:", error);
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

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "O nome da categoria é obrigatório." },
        { status: 400 },
      );
    }

    const newCategory = await prisma.categories.create({
      data: {
        store_id: store.id,
        name: name.trim(),
      },
    });

    return NextResponse.json(
      {
        message: "Categoria criada com sucesso!",
        category: newCategory,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
