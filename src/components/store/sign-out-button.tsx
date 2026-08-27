"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="shrink-0 rounded border border-border px-4 py-2 font-display text-sm hover:border-accent"
    >
      Cerrar sesión
    </button>
  );
}
