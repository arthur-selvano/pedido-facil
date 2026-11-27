import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";

const SLUG_REGEX = /^[a-z0-9-]+$/;
const RESERVED_SLUGS = new Set(["login", "register", "dashboard", "api"]);

function sanitizeStore(store) {
  if (!store) return null;
  const { mp_access_token, ...safeStore } = store;
  return {
    ...safeStore,
    has_mercadopago: Boolean(mp_access_token),
  };
}

export async function POST(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const { name, slug, phone, delivery_fee } = await request.json();

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanSlug =
      typeof slug === "string" ? slug.toLowerCase().trim() : "";

    if (!cleanName || !cleanSlug) {
      return NextResponse.json(
        { error: "O nome e o slug da loja são obrigatórios." },
        { status: 400 },
      );
    }

    if (cleanName.length > 100) {
      return NextResponse.json(
        { error: "O nome da loja deve ter no máximo 100 caracteres." },
        { status: 400 },
      );
    }

    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    if (cleanPhone.length > 20) {
      return NextResponse.json(
        { error: "O WhatsApp deve ter no máximo 20 caracteres." },
        { status: 400 },
      );
    }

    if (!SLUG_REGEX.test(cleanSlug)) {
      return NextResponse.json(
        {
          error:
            "Link personalizado inválido. Use apenas letras minúsculas, números e hífens.",
        },
        { status: 400 },
      );
    }

    if (RESERVED_SLUGS.has(cleanSlug)) {
      return NextResponse.json(
        {
          error:
            "Este link é reservado pelo sistema e não pode ser utilizado.",
        },
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
        name: cleanName,
        slug: cleanSlug,
        phone: cleanPhone || null,
        delivery_fee: delivery_fee ? Number(delivery_fee) : 0,
      },
    });

    return NextResponse.json(
      {
        message: "Loja criada com sucesso!",
        store: sanitizeStore(saveStore),
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

    return NextResponse.json({ store: sanitizeStore(store) });
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

    const updateData = {};

    if (body.is_open !== undefined) {
      if (typeof body.is_open !== "boolean") {
        return NextResponse.json(
          { error: "O status da loja deve ser verdadeiro ou falso." },
          { status: 400 },
        );
      }
      updateData.is_open = body.is_open;
    }

    if (body.name !== undefined) {
      const cleanName = typeof body.name === "string" ? body.name.trim() : "";
      if (!cleanName) {
        return NextResponse.json(
          { error: "O nome da loja é obrigatório." },
          { status: 400 },
        );
      }
      if (cleanName.length > 100) {
        return NextResponse.json(
          { error: "O nome da loja deve ter no máximo 100 caracteres." },
          { status: 400 },
        );
      }
      updateData.name = cleanName;
    }

    if (body.phone !== undefined) {
      if (body.phone === null || body.phone === "") {
        updateData.phone = null;
      } else if (typeof body.phone === "string") {
        const cleanPhone = body.phone.trim();
        if (cleanPhone.length > 20) {
          return NextResponse.json(
            { error: "O WhatsApp deve ter no máximo 20 caracteres." },
            { status: 400 },
          );
        }
        updateData.phone = cleanPhone || null;
      } else {
        return NextResponse.json(
          { error: "Informe um WhatsApp válido." },
          { status: 400 },
        );
      }
    }

    if (body.delivery_fee !== undefined) {
      const numericFee =
        body.delivery_fee === "" || body.delivery_fee === null
          ? 0
          : Number(body.delivery_fee);

      if (
        typeof body.delivery_fee === "boolean" ||
        !Number.isFinite(numericFee) ||
        numericFee < 0 ||
        numericFee >= 100000000
      ) {
        return NextResponse.json(
          {
            error:
              "Informe uma taxa de entrega válida (maior ou igual a zero).",
          },
          { status: 400 },
        );
      }
      updateData.delivery_fee = numericFee;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "Nenhum dado válido enviado para atualização." },
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
      data: updateData,
    });

    const isOnlyToggle =
      Object.keys(updateData).length === 1 && updateData.is_open !== undefined;

    return NextResponse.json({
      message: isOnlyToggle
        ? updatedStore.is_open
          ? "Loja aberta!"
          : "Loja fechada!"
        : "Dados da loja atualizados com sucesso!",
      store: sanitizeStore(updatedStore),
    });
  } catch (error) {
    console.error("Erro ao atualizar dados da loja:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
