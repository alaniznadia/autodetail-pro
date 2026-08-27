import { prisma } from "@/lib/prisma";
import { NewPurchaseForm } from "@/components/admin/new-purchase-form";

export const dynamic = "force-dynamic";

export default async function NewPurchasePage() {
  const suppliers = await prisma.supplier.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Nueva compra</h1>
      <NewPurchaseForm suppliers={suppliers} />
    </div>
  );
}
