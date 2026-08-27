import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const ADMIN_ONLY_PREFIXES = ["/admin", "/api/admin"];
const STAFF_PREFIXES = ["/admin", "/api/admin", "/pos", "/api/pos"]; // ADMIN o EMPLOYEE
const ACCOUNT_PREFIXES = ["/mi-cuenta"]; // cualquier usuario logueado

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const role = req.auth?.user?.role;
  const isApiRoute = pathname.startsWith("/api/");

  const isAccountRoute = ACCOUNT_PREFIXES.some((p) => pathname.startsWith(p));
  const isStaffRoute = STAFF_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isStaffRoute && !isAccountRoute) return NextResponse.next();

  if (!req.auth) {
    if (isApiRoute) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // /mi-cuenta es para cualquier usuario logueado (cliente, empleado o admin),
  // no hace falta el chequeo de rol que sí aplica a las rutas de staff.
  if (isAccountRoute) return NextResponse.next();

  const isAdminRoute = ADMIN_ONLY_PREFIXES.some((p) => pathname.startsWith(p));
  const allowed = isAdminRoute ? role === "ADMIN" : role === "ADMIN" || role === "EMPLOYEE";

  if (!allowed) {
    if (isApiRoute) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/pos/:path*",
    "/api/pos/:path*",
    "/mi-cuenta/:path*",
  ],
};
