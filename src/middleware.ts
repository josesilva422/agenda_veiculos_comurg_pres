import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const role = req.nextauth.token?.role;
    // senha provisória: só deixa usar a tela de troca de senha
    if (req.nextauth.token?.trocarSenha && pathname !== "/trocar-senha") {
      return NextResponse.redirect(new URL("/trocar-senha", req.url));
    }
    if (pathname.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/usuario", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => !!token },
    pages: { signIn: "/login" },
  },
);

export const config = { matcher: ["/admin/:path*", "/usuario/:path*", "/trocar-senha"] };
