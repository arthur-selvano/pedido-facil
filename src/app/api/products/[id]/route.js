import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import { isValidHttpUrl } from "@/lib/security";

const PRODUCT_NAME_MAX_LENGTH = 150;

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

function parseProductId(id) {
  const productId = Number(id);
  if (!Number.isInteger(productId) || productId <= 0) {
    return null;
  }
  return productId;
}

/**
 * Conta quantos pedidos (tabela orders) da loja possuem este produto
 * em seus itens (tabela order_items).
 */
async function countOrdersWithProduct(client, storeId, productId) {
  return client.orders.count({
    where: {
      store_id: storeId,
      order_items: { some: { product_id: productId } },
    },
  });
}

function formatProduct({ categories, _count, ...product }) {
  return {
    ...product,
    price: Number(product.price),
    category_name: categories?.name ?? null,
    has_orders: (_count?.order_items ?? 0) > 0,
  };
}

const productInclude = {
  categories: { select: { name: true } },
  _count: { select: { order_items: true } },
};

// EDITAR PRODUTO
export async function PATCH(request, { params }) {
  try {
    const auth = await getAuthenticatedStore(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const productId = parseProductId(id);

    if (!productId) {
      return NextResponse.json(
        { error: "ID do produto inválido." },
        { status: 400 },
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Corpo da requisição inválido." },
        { status: 400 },
      );
    }

    const existingProduct = await prisma.products.findFirst({
      where: { id: productId, store_id: auth.store.id },
      select: { id: true },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    const updateData = {};

    if (body.available !== undefined) {
      if (typeof body.available !== "boolean") {
        return NextResponse.json(
          { error: "O campo de disponibilidade é inválido." },
          { status: 400 },
        );
      }
      updateData.available = body.available;
    }

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        return NextResponse.json(
          { error: "O nome do produto é obrigatório." },
          { status: 400 },
        );
      }
      if (name.length > PRODUCT_NAME_MAX_LENGTH) {
        return NextResponse.json(
          {
            error: `O nome do produto deve ter no máximo ${PRODUCT_NAME_MAX_LENGTH} caracteres.`,
          },
          { status: 400 },
        );
      }
      updateData.name = name;
    }

    if (body.description !== undefined) {
      const description =
        typeof body.description === "string" ? body.description.trim() : "";
      updateData.description = description || null;
    }

    if (body.price !== undefined) {
      const numericPrice = Number(body.price);
      if (
        body.price === null ||
        body.price === "" ||
        !Number.isFinite(numericPrice) ||
        numericPrice < 0
      ) {
        return NextResponse.json(
          { error: "Informe um preço válido." },
          { status: 400 },
        );
      }
      updateData.price = numericPrice;
    }

    if (body.image_url !== undefined) {
      const imageUrl =
        typeof body.image_url === "string" ? body.image_url.trim() : "";
      if (imageUrl && !isValidHttpUrl(imageUrl)) {
        return NextResponse.json(
          { error: "Informe uma URL de imagem válida (http:// ou https://)." },
          { status: 400 },
        );
      }
      updateData.image_url = imageUrl || null;
    }

    if (body.category_id !== undefined) {
      const categoryId = Number(body.category_id);
      const category = Number.isInteger(categoryId)
        ? await prisma.categories.findFirst({
            where: { id: categoryId, store_id: auth.store.id },
            select: { id: true },
          })
        : null;

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

    const updatedProduct = await prisma.products.update({
      where: { id: productId },
      data: updateData,
      include: productInclude,
    });

    return NextResponse.json({
      message: "Produto atualizado com sucesso!",
      product: formatProduct(updatedProduct),
    });
  } catch (error) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    console.error("Erro ao atualizar produto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

// EXCLUIR PRODUTO (bloqueado caso exista algum pedido com o produto)
export async function DELETE(request, { params }) {
  try {
    const auth = await getAuthenticatedStore(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const productId = parseProductId(id);

    if (!productId) {
      return NextResponse.json(
        { error: "ID do produto inválido." },
        { status: 400 },
      );
    }

    // A verificação e a exclusão rodam na mesma transação para evitar que
    // um pedido seja criado entre a conferência e o delete.
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.products.findFirst({
        where: { id: productId, store_id: auth.store.id },
        select: { id: true, name: true },
      });

      if (!product) {
        return { status: "not_found" };
      }

      const ordersCount = await countOrdersWithProduct(
        tx,
        auth.store.id,
        productId,
      );

      if (ordersCount > 0) {
        return { status: "has_orders", ordersCount, product };
      }

      await tx.products.delete({ where: { id: productId } });
      return { status: "deleted", product };
    });

    if (result.status === "not_found") {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    if (result.status === "has_orders") {
      const plural = result.ordersCount === 1 ? "pedido" : "pedidos";
      return NextResponse.json(
        {
          error: `O produto "${result.product.name}" está vinculado a ${result.ordersCount} ${plural} e não pode ser excluído. Pause o item para ocultá-lo do cardápio.`,
          code: "PRODUCT_HAS_ORDERS",
          orders_count: result.ordersCount,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message: "Produto excluído com sucesso!",
      product_id: productId,
    });
  } catch (error) {
    if (error.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Este produto já possui pedidos registrados e não pode ser excluído. Pause o item para ocultá-lo do cardápio.",
          code: "PRODUCT_HAS_ORDERS",
        },
        { status: 409 },
      );
    }

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Produto não encontrado." },
        { status: 404 },
      );
    }

    console.error("Erro ao excluir produto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
