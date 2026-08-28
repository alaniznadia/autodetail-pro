// NEXT_PUBLIC_SITE_URL puede llegar como string vacío si la variable está
// cargada pero sin completar (pasó en un deploy real a Vercel) — `??` no
// activa el fallback en ese caso porque "" no es null/undefined, así que
// se chequea explícitamente en vez de usar el operador directo.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.length > 0
    ? process.env.NEXT_PUBLIC_SITE_URL
    : "http://localhost:3000";
