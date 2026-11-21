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

    const result = await query("SELECT id FROM stores WHERE user_id = $1", [
      decoded.userId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const store = result.rows[0];

    const fetchProducts = await query(
      `SELECT p.*, c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.store_id = $1
       ORDER BY p.id ASC`,
      [store.id],
    );

    return NextResponse.json({ products: fetchProducts.rows });
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

    const result = await query("SELECT id FROM stores WHERE user_id = $1", [
      decoded.userId,
    ]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Loja não encontrada!" },
        { status: 404 },
      );
    }

    const store = result.rows[0];

    const { category_id, name, description, price, image_url } =
      await request.json();

    if (
      !category_id ||
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

    const categoryCheck = await query(
      "SELECT id FROM categories WHERE id = $1 AND store_id = $2",
      [category_id, store.id],
    );

    if (categoryCheck.rows.length === 0) {
      return NextResponse.json(
        { error: "Categoria inválida ou não pertence à sua loja." },
        { status: 400 },
      );
    }

    const postProducts = await query(
      `INSERT INTO products (store_id, category_id, name, description, price, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        store.id,
        category_id,
        name.trim(),
        description || null,
        Number(price),
        image_url || null,
      ],
    );

    return NextResponse.json(
      { product: postProducts.rows[0] },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao cadastrar produto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
