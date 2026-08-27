export class InsufficientStockError extends Error {
  constructor(public readonly variantId: string, public readonly requested: number) {
    super(`Stock insuficiente para la variante ${variantId} (pedido: ${requested})`);
    this.name = "InsufficientStockError";
  }
}
