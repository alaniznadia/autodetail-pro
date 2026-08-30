import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  const keys: string[] = [];

  function uniqueKey(prefix: string) {
    const key = `${prefix}-${Date.now()}-${Math.random()}`;
    keys.push(key);
    return key;
  }

  afterAll(async () => {
    await prisma.rateLimit.deleteMany({ where: { key: { in: keys } } });
    await prisma.$disconnect();
  });

  it("permite requests dentro del límite", async () => {
    const key = uniqueKey("ok");
    for (let i = 0; i < 3; i++) {
      const { allowed } = await checkRateLimit(key, { limit: 3, windowMs: 60_000 });
      expect(allowed).toBe(true);
    }
  });

  it("bloquea al superar el límite dentro de la ventana", async () => {
    const key = uniqueKey("block");
    for (let i = 0; i < 3; i++) {
      await checkRateLimit(key, { limit: 3, windowMs: 60_000 });
    }
    const { allowed, retryAfterMs } = await checkRateLimit(key, { limit: 3, windowMs: 60_000 });
    expect(allowed).toBe(false);
    expect(retryAfterMs).toBeGreaterThan(0);
  });

  it("resetea el contador una vez que pasó la ventana", async () => {
    const key = uniqueKey("reset");
    await checkRateLimit(key, { limit: 1, windowMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const { allowed } = await checkRateLimit(key, { limit: 1, windowMs: 1 });
    expect(allowed).toBe(true);
  });

  it("no permite que dos requests concurrentes se cuelen por la misma ventana", async () => {
    const key = uniqueKey("race");
    const results = await Promise.all(
      Array.from({ length: 5 }, () => checkRateLimit(key, { limit: 3, windowMs: 60_000 }))
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(3);
  });
});
