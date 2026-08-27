import { Prisma, OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Estados que cuentan como venta reconocida (ya cobrada o comprometida).
// Quedan afuera PENDING (todavía no se cobró), CANCELLED y REFUNDED.
export const REVENUE_STATUSES: OrderStatus[] = [
  "PAID",
  "PREPARING",
  "SHIPPED",
  "DELIVERED",
  "PICKED_UP",
];

export async function getSalesReport(from: Date, to: Date) {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: REVENUE_STATUSES },
      createdAt: { gte: from, lte: to },
    },
    include: {
      items: { include: { variant: { include: { product: true } } } },
    },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const onlineRevenue = orders
    .filter((o) => o.channel === "ONLINE")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const posRevenue = orders
    .filter((o) => o.channel === "POS")
    .reduce((sum, o) => sum + Number(o.total), 0);

  const productTotals = new Map<
    string,
    { name: string; variantName: string; quantity: number; revenue: number }
  >();

  for (const order of orders) {
    for (const item of order.items) {
      const key = item.variantId;
      const existing = productTotals.get(key);
      const revenue = Number(item.totalPrice);
      if (existing) {
        existing.quantity += item.quantity;
        existing.revenue += revenue;
      } else {
        productTotals.set(key, {
          name: item.variant.product.name,
          variantName: item.variant.name,
          quantity: item.quantity,
          revenue,
        });
      }
    }
  }

  const topProducts = Array.from(productTotals.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return {
    orderCount: orders.length,
    totalRevenue,
    onlineRevenue,
    posRevenue,
    averageTicket: orders.length > 0 ? totalRevenue / orders.length : 0,
    topProducts,
  };
}

export async function getStockValuation() {
  const stockItems = await prisma.stockItem.findMany({
    include: { variant: true },
  });

  let valuedAtCost = new Prisma.Decimal(0);
  let valuedAtPrice = new Prisma.Decimal(0);
  let totalUnits = 0;

  for (const item of stockItems) {
    totalUnits += item.quantity;
    valuedAtPrice = valuedAtPrice.add(item.variant.price.mul(item.quantity));
    if (item.variant.costPrice) {
      valuedAtCost = valuedAtCost.add(item.variant.costPrice.mul(item.quantity));
    }
  }

  const lowStockCount = stockItems.filter((i) => i.quantity <= i.lowStockAlert).length;

  return {
    totalUnits,
    valuedAtCost: valuedAtCost.toNumber(),
    valuedAtPrice: valuedAtPrice.toNumber(),
    lowStockCount,
  };
}
