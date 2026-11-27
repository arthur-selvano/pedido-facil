import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateMercadoPagoToken } from "@/lib/mercadopago";

async function getAuthenticatedStore(request) {
  const token = request.cookies.get("token")?.value;
  const decoded = verifyToken(token);

  if (!decoded) {
    return {
      errorResponse: NextResponse.json(
        { error: "Não autorizado." },
        { status: 401 },
      ),
    };
  }

  const store = await prisma.stores.findFirst({
    where: { user_id: decoded.userId },
    select: {
      id: true,
      name: true,
      mp_access_token: true,
      mp_public_key: true,
    },
  });

  if (!store) {
    return {
      errorResponse: NextResponse.json(
        { error: "Loja não encontrada." },
        { status: 404 },
      ),
    };
  }

  return { store };
}

export async function GET(request) {
  try {
    const { store, errorResponse } = await getAuthenticatedStore(request);
    if (errorResponse) return errorResponse;

    const hasStoreToken = Boolean(store.mp_access_token?.trim());
    const hasStorePublicKey = Boolean(store.mp_public_key?.trim());
    const hasPlatformFallback = Boolean(
      process.env.MERCADOPAGO_ACCESS_TOKEN?.trim(),
    );
    const hasPlatformPublicKey = Boolean(
      process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ||
        process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim(),
    );

    return NextResponse.json({
      configured: hasStoreToken,
      hasPublicKey: hasStorePublicKey || hasPlatformPublicKey,
      hasStorePublicKey,
      hasPlatformFallback,
      isSandbox:
        hasStoreToken && store.mp_access_token.trim().startsWith("TEST-"),
    });
  } catch (error) {
    console.error("Erro ao consultar configuração do Mercado Pago:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { store, errorResponse } = await getAuthenticatedStore(request);
    if (errorResponse) return errorResponse;

    const body = await request.json().catch(() => null);
    const accessToken =
      typeof body?.access_token === "string" ? body.access_token.trim() : "";
    const publicKey =
      typeof body?.public_key === "string" ? body.public_key.trim() : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "Informe o Access Token do Mercado Pago." },
        { status: 400 },
      );
    }

    const validation = await validateMercadoPagoToken(accessToken);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Access Token inválido." },
        { status: 400 },
      );
    }

    await prisma.stores.update({
      where: { id: store.id },
      data: {
        mp_access_token: accessToken,
        mp_public_key: publicKey || null,
      },
    });

    return NextResponse.json({
      configured: true,
      hasPublicKey: Boolean(
        publicKey ||
          process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ||
          process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.trim(),
      ),
      hasStorePublicKey: Boolean(publicKey),
      isSandbox: validation.isSandbox,
      account: validation.account,
      message: "Mercado Pago conectado com sucesso!",
    });
  } catch (error) {
    console.error("Erro ao salvar configuração do Mercado Pago:", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível validar o token no Mercado Pago agora. Tente novamente.",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(request) {
  try {
    const { store, errorResponse } = await getAuthenticatedStore(request);
    if (errorResponse) return errorResponse;

    await prisma.stores.update({
      where: { id: store.id },
      data: {
        mp_access_token: null,
        mp_public_key: null,
      },
    });

    return NextResponse.json({
      configured: false,
      hasPublicKey: false,
      hasStorePublicKey: false,
      message: "Mercado Pago desconectado com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao desconectar Mercado Pago:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
