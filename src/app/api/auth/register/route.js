import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  checkRateLimit,
  rateLimitResponse,
  isValidEmail,
} from "@/lib/security";

export async function POST(request) {
  try {
    const rl = checkRateLimit(request, {
      key: "auth:register",
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const body = await request.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (
      !name ||
      name.length > 100 ||
      !isValidEmail(email) ||
      password.length < 6 ||
      password.length > 128
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha nome, um e-mail válido e uma senha com pelo menos 6 caracteres.",
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
