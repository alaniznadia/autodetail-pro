import { describe, it, expect } from "vitest";
import { toWhatsAppE164AR } from "@/lib/phone";

describe("toWhatsAppE164AR", () => {
  it("normaliza un número local de 10 dígitos sin ningún prefijo", () => {
    expect(toWhatsAppE164AR("1123456789")).toBe("5491123456789");
  });

  it("saca el 0 de larga distancia", () => {
    expect(toWhatsAppE164AR("01123456789")).toBe("5491123456789");
  });

  it("acepta el número ya con código de país 54", () => {
    expect(toWhatsAppE164AR("541123456789")).toBe("5491123456789");
  });

  it("acepta el número ya con el 9 de WhatsApp y +54", () => {
    expect(toWhatsAppE164AR("+5491123456789")).toBe("5491123456789");
  });

  it("ignora espacios, guiones y paréntesis", () => {
    expect(toWhatsAppE164AR("(011) 2345-6789")).toBe("5491123456789");
  });

  it("devuelve null si quedan menos de 10 dígitos", () => {
    expect(toWhatsAppE164AR("12345")).toBeNull();
  });

  it("devuelve null para un string vacío", () => {
    expect(toWhatsAppE164AR("")).toBeNull();
  });
});
