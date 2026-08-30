"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return <p className="text-[18px] text-foreground/85">¡Gracias por suscribirte!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-2 sm:flex-row">
      <label htmlFor="newsletter-email" className="sr-only">
        Email
      </label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="tu@email.com"
        className="w-full rounded border border-border bg-transparent px-3 py-2 text-[18px] outline-none focus:border-accent"
      />
      <button
        type="submit"
        disabled={status === "submitting"}
        className="store-frame shrink-0 border-accent px-4 py-2 text-[18px] text-accent hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "submitting" ? "Enviando…" : "Suscribirme"}
      </button>
      {status === "error" && (
        <p role="alert" className="text-[16px] text-red-400">
          No se pudo suscribir, probá de nuevo.
        </p>
      )}
    </form>
  );
}
