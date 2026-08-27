import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchWithRetry, NetworkError } from "@/lib/fetch-retry";

describe("fetchWithRetry", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("devuelve la respuesta si el primer intento funciona", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("http://test", {}, { retries: 2, backoffMs: 1 });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("reintenta ante una falla de red y termina teniendo éxito", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(new Response("ok", { status: 201 }));

    const res = await fetchWithRetry("http://test", {}, { retries: 2, backoffMs: 1 });

    expect(res.status).toBe(201);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("reintenta ante un error 5xx (probablemente transitorio) y termina teniendo éxito", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("error", { status: 503 }))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }));

    const res = await fetchWithRetry("http://test", {}, { retries: 2, backoffMs: 1 });

    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it("no reintenta ante un error 4xx: no va a cambiar si repetimos la misma request", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("bad", { status: 400 }));

    const res = await fetchWithRetry("http://test", {}, { retries: 2, backoffMs: 1 });

    expect(res.status).toBe(400);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("lanza NetworkError después de agotar todos los reintentos", async () => {
    global.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    await expect(
      fetchWithRetry("http://test", {}, { retries: 2, backoffMs: 1 })
    ).rejects.toThrow(NetworkError);
    // intento inicial + 2 reintentos
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("aborta la conexión si el servidor no responde dentro del timeout", async () => {
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError"))
          );
        })
    );

    await expect(
      fetchWithRetry("http://test", {}, { retries: 0, timeoutMs: 20, backoffMs: 1 })
    ).rejects.toThrow(NetworkError);
  });
});
