import { Prisma } from "@prisma/client";
import { InsufficientStockError } from "@/lib/errors";

export type SaleItemInput = {
  variantId: string;
  quantity: number;
};

type TxClient = Prisma.TransactionClient;

/**
 * Descuenta stock de forma atómica para cada ítem, en una única sentencia
 * UPDATE condicionada por cantidad disponible. Si algún ítem no tiene
 * stock suficiente, lanza InsufficientStockError y el resto de la
 * transacción que la envuelve se revierte (no se descuenta "a medias").
 *
 * La usan tanto la venta del POS como el checkout online: es lo que
 * garantiza que ambos canales compartan el mismo stock real, incluso
 * bajo ventas simultáneas.
 */
export async function decrementStock(
  tx: TxClient,
  locationId: string,
  items: SaleItemInput[]
) {
  for (const item of items) {
    const updated = await tx.stockItem.updateMany({
      where: {
        variantId: item.variantId,
        locationId,
        quantity: { gte: item.quantity },
      },
      data: { quantity: { decrement: item.quantity } },
    });

    if (updated.count === 0) {
      throw new InsufficientStockError(item.variantId, item.quantity);
    }
  }
}

/**
 * Busca precio y datos de cada variante y arma las líneas de pedido +
 * subtotal. No toca stock; se usa junto con decrementStock.
 */
export async function priceOrderItems(tx: TxClient, items: SaleItemInput[]) {
  const variants = await tx.productVariant.findMany({
    where: { id: { in: items.map((i) => i.variantId) } },
  });
  const variantById = new Map(variants.map((v) => [v.id, v]));

  let subtotal = new Prisma.Decimal(0);
  const orderItemsData: Prisma.OrderItemCreateManyOrderInput[] = [];

  for (const item of items) {
    const variant = variantById.get(item.variantId);
    if (!variant) throw new Error(`Variante no encontrada: ${item.variantId}`);

    const totalPrice = variant.price.mul(item.quantity);
    subtotal = subtotal.add(totalPrice);

    orderItemsData.push({
      variantId: item.variantId,
      quantity: item.quantity,
      unitPrice: variant.price,
      totalPrice,
    });
  }

  return { subtotal, orderItemsData };
}
