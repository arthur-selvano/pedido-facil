import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { decode } from "jsonwebtoken";

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

    const userHasStore = await query(
      "SELECT id FROM stores WHERE user_id = $1",
      [decoded.userId],
    );

    if (userHasStore.rows.length > 0) {
      return NextResponse.json(
        { error: "Você já possui uma loja cadastrada." },
        { status: 400 },
      );
    }

    const cleanSlug = slug.toLowerCase().trim();

    const storeExists = await query("SELECT id FROM stores WHERE slug = $1", [
      cleanSlug,
    ]);

    if (storeExists.rows.length > 0) {
      return NextResponse.json(
        { error: "Este link de loja já está em uso." },
        { status: 409 },
      );
    }

    const saveStore = await query(
      `INSERT INTO stores (user_id, name, slug, phone, delivery_fee)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        decoded.userId,
        name.trim(),
        cleanSlug,
        phone || null,
        delivery_fee || 0,
      ],
    );

    return NextResponse.json(
      {
        message: "Loja criada com sucesso!",
        store: saveStore.rows[0],
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

    if (!decode) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const result = await query("SELECT * FROM stores WHERE user_id = $1", [
      decoded.userId,
    ]);

    return NextResponse.json({ store: result.rows[0] || null });
  } catch (error) {
    console.error("Erro ao buscar loja:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor. " },
      { status: 500 },
    );
  }
}
