"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SupplierForm() {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contactName, phone, email }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el proveedor.");
      return;
    }

    setName("");
    setContactName("");
    setPhone("");
    setEmail("");
    setShowForm(false);
    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
      >
        {showForm ? "Cancelar" : "+ Nuevo proveedor"}
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="mt-4 flex max-w-md flex-col gap-4">
          <div>
            <label htmlFor="supplier-name" className="block text-sm">
              Nombre
            </label>
            <input
              id="supplier-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="supplier-contact" className="block text-sm">
              Persona de contacto
            </label>
            <input
              id="supplier-contact"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="supplier-phone" className="block text-sm">
              Teléfono
            </label>
            <input
              id="supplier-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="supplier-email" className="block text-sm">
              Email
            </label>
            <input
              id="supplier-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-red-400">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {submitting ? "Guardando..." : "Guardar"}
          </button>
        </form>
      )}
    </div>
  );
}
