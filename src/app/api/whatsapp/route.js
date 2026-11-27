import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  isWhatsAppConfigured,
  getStoreInstanceName,
  getInstanceState,
  connectInstance,
  disconnectInstance,
} from "@/lib/whatsapp";

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
      whatsapp_instance: true,
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

    if (!isWhatsAppConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
        state: "unconfigured",
      });
    }

    if (!store.whatsapp_instance) {
      return NextResponse.json({
        configured: true,
        connected: false,
        state: "close",
      });
    }

    const status = await getInstanceState(store.whatsapp_instance);

    return NextResponse.json({
      configured: true,
      connected: status.state === "open",
      state: status.state,
    });
  } catch (error) {
    console.error("Erro ao consultar status do WhatsApp:", error);
    return NextResponse.json({
      configured: true,
      connected: false,
      state: "error",
      error: "Não foi possível consultar o servidor do WhatsApp.",
    });
  }
}

export async function POST(request) {
  try {
    const { store, errorResponse } = await getAuthenticatedStore(request);
    if (errorResponse) return errorResponse;

    if (!isWhatsAppConfigured()) {
      return NextResponse.json(
        { error: "O serviço de WhatsApp não está configurado no servidor." },
        { status: 503 },
      );
    }

    const instanceName = getStoreInstanceName(store);

    if (!store.whatsapp_instance) {
      await prisma.stores.update({
        where: { id: store.id },
        data: { whatsapp_instance: instanceName },
      });
    }

    const result = await connectInstance(instanceName);

    return NextResponse.json({
      configured: true,
      connected: result.state === "open",
      state: result.state,
      qrcode: result.qrcode,
      pairingCode: result.pairingCode,
    });
  } catch (error) {
    console.error("Erro ao conectar WhatsApp:", error);
    return NextResponse.json(
      {
        error:
          "Não foi possível gerar o QR Code agora. Verifique se o serviço de WhatsApp está ativo e tente novamente.",
      },
      { status: 502 },
    );
  }
}

export async function DELETE(request) {
  try {
    const { store, errorResponse } = await getAuthenticatedStore(request);
    if (errorResponse) return errorResponse;

    if (!isWhatsAppConfigured()) {
      return NextResponse.json(
        { error: "O serviço de WhatsApp não está configurado no servidor." },
        { status: 503 },
      );
    }

    if (store.whatsapp_instance) {
      await disconnectInstance(store.whatsapp_instance);
    }

    return NextResponse.json({
      configured: true,
      connected: false,
      state: "close",
    });
  } catch (error) {
    console.error("Erro ao desconectar WhatsApp:", error);
    return NextResponse.json(
      { error: "Não foi possível desconectar o WhatsApp." },
      { status: 502 },
    );
  }
}
