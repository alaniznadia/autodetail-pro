import { prisma } from "@/lib/prisma";
import { ImportRemitoForm } from "@/components/admin/import-remito-form";

export const dynamic = "force-dynamic";

export default async function ImportRemitoPage() {
  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Importar remito o ticket</h1>
      <p className="mt-2 max-w-2xl text-sm text-foreground/70">
        Subí el PDF del remito o una foto del ticket del proveedor. La IA lee los ítems y
        productos existentes por SKU, código de barras o nombre para que solo tengas que
        revisar y confirmar antes de que la compra ingrese el stock.
      </p>
      <ImportRemitoForm suppliers={suppliers} />
    </div>
  );
}
