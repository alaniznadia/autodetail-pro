import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

type AuthResult =
  | { session: Session; response?: undefined }
  | { session?: undefined; response: NextResponse };

/**
 * Exige una sesión activa con alguno de los roles dados. Los endpoints la
 * usan como guard clause: si `response` viene definida hay que devolverla
 * tal cual y cortar el handler; si no, `session` está garantizada.
 */
export async function requireRole(...roles: Role[]): Promise<AuthResult> {
  const session = await auth();
  if (!session?.user) {
    return { response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }
  if (!roles.includes(session.user.role as Role)) {
    return { response: NextResponse.json({ error: "No tenés permisos para esto" }, { status: 403 }) };
  }
  return { session: session as Session };
}

// El panel de administración (/admin) es exclusivo de ADMIN: gestiona
// usuarios, precios, cupones y configuración global de la tienda.
export const requireAdmin = () => requireRole("ADMIN");

// El POS (/pos) lo usan tanto administradores como empleados de local.
export const requireStaff = () => requireRole("ADMIN", "EMPLOYEE");
