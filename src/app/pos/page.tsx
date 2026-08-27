import { prisma } from "@/lib/prisma";
import { PosTerminal } from "@/components/pos/pos-terminal";

export default async function PosPage() {
  const location = await prisma.location.findFirst({ where: { isMain: true } });

  if (!location) {
    return (
      <p className="text-sm text-foreground/70">
        No hay ninguna sucursal configurada todavía. Creá una desde el panel de administración.
      </p>
    );
  }

  return <PosTerminal locationId={location.id} />;
}
