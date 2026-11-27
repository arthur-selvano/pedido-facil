import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function proxy(request) {
  const token = request.cookies.get("token")?.value;

  try {
    const decoded = verifyToken(token);

    if (!decoded) {
      const response = NextResponse.redirect(new URL("/login", request.url));
      if (token) {
        response.cookies.delete("token");
      }
      return response;
    }
  } catch (error) {
    console.error("Erro ao verificar sessão no proxy:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
