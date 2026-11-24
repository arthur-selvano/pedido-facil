import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { name, slug, phone, delivery_fee } = await request.json();

    if (!name || !slug) {
      return NextResponse.json(
        { error: "O nome e o slug da loja são obrigatórios." },
        { status: 400 },
      );
    }

    const userHasStore = await prisma.stores.findFirst({
      where: { user_id: decoded.userId },
      select: { id: true },
    });

    if (userHasStore) {
      return NextResponse.json(
        { error: "Você já possui uma loja cadastrada." },
        { status: 400 },
      );
    }

    const cleanSlug = slug.toLowerCase().trim();

    const storeExists = await prisma.stores.findUnique({
      where: { slug: cleanSlug },
      select: { id: true },
    });

    if (storeExists) {
      return NextResponse.json(
        { error: "Este link de loja já está em uso." },
        { status: 409 },
      );
    }

    const saveStore = await prisma.stores.create({
      data: {
        user_id: decoded.userId,
        name: name.trim(),
        slug: cleanSlug,
        phone: phone || null,
        delivery_fee: delivery_fee ? Number(delivery_fee) : 0,
      },
    });

    return NextResponse.json(
      {
        message: "Loja criada com sucesso!",
        store: saveStore,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao criar loja:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const store = await prisma.stores.findFirst({
      where: { user_id: decoded.userId },
    });

    return NextResponse.json({ store: store || null });
  } catch (error) {
    console.error("Erro ao buscar loja:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function PATCH(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { is_open } = await request.json();

    if (typeof is_open !== "boolean") {
      return NextResponse.json(
        { error: "O status da loja deve ser verdadeiro ou falso." },
        { status: 400 },
      );
    }

    const existingStore = await prisma.stores.findFirst({
      where: { user_id: decoded.userId },
      select: { id: true },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
      );
    }

    const updatedStore = await prisma.stores.update({
      where: { id: existingStore.id },
      data: { is_open },
    });

    return NextResponse.json({
      message: is_open ? "Loja aberta!" : "Loja fechada!",
      store: updatedStore,
    });
  } catch (error) {
    console.error("Erro ao atualizar status da loja:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
