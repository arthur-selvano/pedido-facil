import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const result = await query("SELECT * FROM stores WHERE user_id = $1", [
      decoded.userId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const store = result.rows[0];

    const fetchCategories = await query(
      "SELECT * FROM categories WHERE store_id = $1 ORDER BY id ASC",
      [store.id],
    );

    return NextResponse.json({ categories: fetchCategories.rows });
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

    const storeResult = await query(
      "SELECT id FROM stores WHERE user_id = $1",
      [decoded.userId],
    );

    if (storeResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const store = storeResult.rows[0];

    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "O nome da categoria é obrigatório." },
        { status: 400 },
      );
    }

    const newCategory = await query(
      "INSERT INTO categories (store_id, name) VALUES ($1, $2) RETURNING *",
      [store.id, name.trim()],
    );

    return NextResponse.json(
      {
        message: "Categoria criada com sucesso!",
        category: newCategory.rows[0],
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
