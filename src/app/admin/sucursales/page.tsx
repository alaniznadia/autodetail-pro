import { prisma } from "@/lib/prisma";
import { LocationsPanel } from "@/components/admin/locations-panel";

export const dynamic = "force-dynamic";

export default async function AdminLocationsPage() {
  const locations = await prisma.location.findMany({
    orderBy: [{ isMain: "desc" }, { name: "asc" }],
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Sucursales</h1>
      <div className="mt-6">
        <LocationsPanel locations={locations} />
      </div>
    </div>
  );
}
