import { prisma } from "@/lib/prisma";
import { CashRegisterPanel } from "@/components/pos/cash-register-panel";

export default async function PosCashRegisterPage() {
  const location = await prisma.location.findFirst({ where: { isMain: true } });

  if (!location) {
    return (
      <p className="text-sm text-foreground/70">
        No hay ninguna sucursal configurada todavía.
      </p>
    );
  }

  return <CashRegisterPanel locationId={location.id} />;
}
