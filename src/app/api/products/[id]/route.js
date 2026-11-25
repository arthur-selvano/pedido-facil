import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

async function getAuthenticatedStore(request) {
  const token = request.cookies.get("token")?.value;
  const decoded = verifyToken(token);

  if (!decoded) {
    return { error: "Não autorizado.", status: 401 };
  }

  const store = await prisma.stores.findFirst({
    where: { user_id: decoded.userId },
    select: { id: true },
  });

  if (!store) {
    return { error: "Loja não encontrada.", status: 404 };
  }

  return { store };
}

export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthenticatedStore(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "ID do produto inválido." },
        { status: 400 },
      );
    }

    const body = await request.json();
    const updateData = {};

    if (typeof body.available === "boolean") {
      updateData.available = body.available;
    }

    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: "O nome do produto é obrigatório." },
          { status: 400 },
        );
      }
      updateData.name = body.name.trim();
    }

    if (body.description !== undefined) {
      updateData.description = body.description
        ? body.description.trim()
        : null;
    }

    if (body.price !== undefined) {
      const numericPrice = Number(body.price);
      if (isNaN(numericPrice) || numericPrice < 0) {
        return NextResponse.json(
          { error: "Informe um preço válido." },
          { status: 400 },
        );
      }
      updateData.price = numericPrice;
    }

    if (body.image_url !== undefined) {
      updateData.image_url = body.image_url ? body.image_url.trim() : null;
    }

    if (body.category_id !== undefined) {
      const categoryId = Number(body.category_id);
      const category = await prisma.categories.findFirst({
        where: { id: categoryId, store_id: auth.store.id },
        select: { id: true },
      });

      if (!category) {
        return NextResponse.json(
          { error: "Categoria inválida para esta loja." },
          { status: 400 },
        );
      }
      updateData.category_id = categoryId;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nenhum dado válido enviado para atualização." },
        { status: 400 },
      );
    }

    const result = await prisma.products.updateMany({
      where: {
        id: productId,
        store_id: auth.store.id,
      },
      data: updateData,
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    const updatedProduct = await prisma.products.findUnique({
      where: { id: productId },
    });

    return NextResponse.json({
      message: "Produto atualizado com sucesso!",
      product: {
        ...updatedProduct,
        price: Number(updatedProduct.price),
      },
    });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await getAuthenticatedStore(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const productId = Number(id);

    if (isNaN(productId)) {
      return NextResponse.json(
        { error: "ID do produto inválido." },
        { status: 400 },
      );
    }

    const result = await prisma.products.deleteMany({
      where: {
        id: productId,
        store_id: auth.store.id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({ message: "Produto excluído com sucesso!" });
  } catch (error) {
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Este produto já possui pedidos registrados e não pode ser excluído. Use o botão de pausar para ocultá-lo do cardápio.",
        },
        { status: 400 },
      );
    }

    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
