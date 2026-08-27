import { describe, it, expect } from "vitest";
import { mapMercadoPagoStatus } from "@/lib/mercadopago";

// La lógica de mapeo es pura (no llama a la API de Mercado Pago), así que
// se puede testear sin credenciales reales.
describe("mapMercadoPagoStatus", () => {
  it("marca el pedido como pagado cuando el pago está aprobado", () => {
    expect(mapMercadoPagoStatus("approved")).toEqual({
      paymentStatus: "APPROVED",
      orderStatus: "PAID",
    });
  });

  it("marca el pedido como reembolsado en refunded y charged_back", () => {
    expect(mapMercadoPagoStatus("refunded").orderStatus).toBe("REFUNDED");
    expect(mapMercadoPagoStatus("charged_back").orderStatus).toBe("REFUNDED");
  });

  it("cancela el pedido cuando el pago se cancela", () => {
    expect(mapMercadoPagoStatus("cancelled")).toEqual({
      paymentStatus: "CANCELLED",
      orderStatus: "CANCELLED",
    });
  });

  it("rechaza el pago sin tocar el estado del pedido", () => {
    const result = mapMercadoPagoStatus("rejected");
    expect(result.paymentStatus).toBe("REJECTED");
    expect(result.orderStatus).toBeUndefined();
  });

  it("deja pendiente cualquier estado intermedio o desconocido", () => {
    for (const status of ["pending", "in_process", "in_mediation", "authorized", "algo_nuevo"]) {
      const result = mapMercadoPagoStatus(status);
      expect(result.paymentStatus).toBe("PENDING");
      expect(result.orderStatus).toBeUndefined();
    }
  });
});
