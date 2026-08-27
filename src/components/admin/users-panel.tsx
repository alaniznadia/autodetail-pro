"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  active: boolean;
  createdAt: string;
};

export function UsersPanel({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo crear el usuario.");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    setRole("EMPLOYEE");
    setShowForm(false);
    router.refresh();
  }

  async function updateUser(id: string, patch: { role?: string; active?: boolean }) {
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(typeof data.error === "string" ? data.error : "No se pudo actualizar el usuario.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Usuarios</h1>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background"
        >
          {showForm ? "Cancelar" : "+ Nuevo usuario"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mt-6 flex max-w-md flex-col gap-4">
          <div>
            <label htmlFor="name" className="block text-sm">
              Nombre
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            />
          </div>
          <div>
            <label htmlFor="role" className="block text-sm">
              Rol
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "EMPLOYEE")}
              className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
            >
              <option value="EMPLOYEE">Empleado (vende en el local)</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
          >
            {submitting ? "Creando..." : "Crear usuario"}
          </button>
        </form>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Nombre</th>
              <th className="p-3 font-display font-normal">Email</th>
              <th className="p-3 font-display font-normal">Rol</th>
              <th className="p-3 font-display font-normal">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">
                  <select
                    value={u.role}
                    onChange={(e) => updateUser(u.id, { role: e.target.value })}
                    className="rounded border border-border bg-background px-2 py-1"
                  >
                    <option value="EMPLOYEE">Empleado</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </td>
                <td className="p-3">{u.active ? "Activo" : "Inactivo"}</td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => updateUser(u.id, { active: !u.active })}
                    disabled={u.id === currentUserId}
                    className="text-sm underline underline-offset-4 disabled:opacity-40"
                  >
                    {u.active ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
