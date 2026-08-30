"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/mi-cuenta";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, phone: phone || undefined, password }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setLoading(false);
      setError(typeof data.error === "string" ? data.error : "No se pudo crear la cuenta.");
      return;
    }

    const result = await signIn("credentials", { email, password, redirect: false });

    setLoading(false);

    if (result?.error) {
      // La cuenta se creó bien pero el login automático falló; el usuario
      // puede ingresar manualmente con las credenciales que acaba de crear.
      router.push("/login");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Crear cuenta</h1>
      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="name" className="block font-display text-sm">
            Nombre y apellido
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="email" className="block font-display text-sm">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block font-display text-sm">
            Teléfono (opcional)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="11 2345-6789 (sin 0 ni 15)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-base"
          />
        </div>
        <div>
          <label htmlFor="password" className="block font-display text-sm">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-base"
          />
          <p className="mt-1 text-xs text-foreground/60">Mínimo 8 caracteres.</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>
      <p className="mt-6 text-sm text-foreground/70">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline underline-offset-4">
          Ingresá
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
