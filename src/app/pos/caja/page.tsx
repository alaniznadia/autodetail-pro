import { prisma } from "@/lib/prisma";
import { CashRegisterMobile } from "@/components/pos/cash-register-mobile";

export default async function PosCashRegisterPage() {
  const location = await prisma.location.findFirst({ where: { isMain: true } });

  if (!location) {
    return (
      <p className="text-sm text-foreground/70">
        No hay ninguna sucursal configurada todavía.
      </p>
    );
  }

  return <CashRegisterMobile locationId={location.id} />;
}
