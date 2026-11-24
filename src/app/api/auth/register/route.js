import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/db";

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

    const normalizedEmail = email.toLowerCase();

    const existingUser = await prisma.users.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe alguem com esse e-mail." },
        { status: 409 },
      );
    }

    const hash = await bcrypt.hash(password, 10);

    const createUser = await prisma.users.create({
      data: {
        name,
        email: normalizedEmail,
        password_hash: hash,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    return NextResponse.json(
      {
        message: "Usuário cadastrado com sucesso!",
        user: createUser,
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
