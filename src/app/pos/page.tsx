import { prisma } from "@/lib/prisma";
import { PosMobileTerminal } from "@/components/pos/pos-mobile-terminal";

export default async function PosPage() {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  if (locations.length === 0) {
    return (
      <p className="text-sm text-foreground/70">
        No hay ninguna sucursal configurada todavía. Creá una desde el panel de administración.
      </p>
    );
  }

  const initial = locations.find((l) => l.isMain) ?? locations[0];

  return (
    <PosMobileTerminal
      locations={locations.map((l) => ({ id: l.id, name: l.name }))}
      initialLocationId={initial.id}
    />
  );
}
