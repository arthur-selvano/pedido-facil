import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { query } from "@/lib/db";
import { decode } from "jsonwebtoken";

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
