import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { signToken } from "@/lib/auth";
import {
  checkRateLimit,
  rateLimitResponse,
  isValidEmail,
} from "@/lib/security";

export async function POST(request) {
  try {
    const rl = checkRateLimit(request, {
      key: "auth:login",
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });
    if (!rl.allowed) {
      return rateLimitResponse(rl.retryAfterSeconds);
    }

    const body = await request.json().catch(() => null);
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password || !isValidEmail(email) || password.length > 128) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 400 },
      );
    }

    const user = await prisma.users.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        password_hash: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return NextResponse.json(
        { error: "E-mail ou senha inválidos." },
        { status: 401 },
      );
    }

    const token = signToken({ userId: user.id, email: user.email });

    const response = NextResponse.json(
      { message: "Autenticado com sucesso!" },
      { status: 200 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
