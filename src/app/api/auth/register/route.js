import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "../../../../lib/db";

export async function POST(request) {
  try {
    const { name, email, password } = await request.json();

    if (!name || !email || !password || password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Não pode haver parâmetros nulos ou a senha tem que ser maior que 6 caracteres.",
        },
        { status: 400 },
      );
    }

    const existingUser = await query("SELECT id FROM users WHERE email = $1", [
      email.toLowerCase(),
    ]);

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { error: "Já existe alguem com esse e-mail." },
        { status: 409 },
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const createUser = await query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email.toLowerCase(), hash],
    );

    return NextResponse.json(
      {
        message: "Usuário cadastrado com sucesso!",
        user: createUser.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao cadastrar:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
