import { prisma } from "@/lib/prisma";
import { SupplierForm } from "@/components/admin/supplier-form";

export const dynamic = "force-dynamic";

export default async function AdminSuppliersPage() {
  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Proveedores</h1>
      </div>

      <div className="mt-6">
        <SupplierForm />
      </div>

      <div className="mt-8 overflow-x-auto rounded border border-border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b border-border text-foreground/60">
            <tr>
              <th className="p-3 font-display font-normal">Nombre</th>
              <th className="p-3 font-display font-normal">Contacto</th>
              <th className="p-3 font-display font-normal">Teléfono</th>
              <th className="p-3 font-display font-normal">Email</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b border-border last:border-0">
                <td className="p-3">{s.name}</td>
                <td className="p-3">{s.contactName ?? "—"}</td>
                <td className="p-3">{s.phone ?? "—"}</td>
                <td className="p-3">{s.email ?? "—"}</td>
              </tr>
            ))}
            {suppliers.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-foreground/60">
                  Todavía no cargaste ningún proveedor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
