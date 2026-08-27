export class NetworkError extends Error {}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * fetch con timeout y reintento automático, pensado para las llamadas
 * críticas del checkout (crear el pedido, iniciar el pago). Reintenta
 * fallas de red (fetch nunca llegó a responder) y errores 5xx —
 * probablemente transitorios — pero nunca 4xx, que no van a cambiar si
 * repetimos la misma request. Quien la usa después decide si mostrar el
 * error o reintentar manualmente; acá solo se resuelve lo automático.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  { retries = 2, timeoutMs = 15000, backoffMs = 1000 } = {}
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);

      if (res.status >= 500 && attempt < retries) {
        lastError = new Error(`HTTP ${res.status}`);
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }

      return res;
    } catch (err) {
      clearTimeout(timeout);
      lastError = err;
      if (attempt < retries) {
        await sleep(backoffMs * 2 ** attempt);
        continue;
      }
    }
  }

  throw new NetworkError(
    "No se pudo conectar con el servidor. Revisá tu conexión a internet e intentá de nuevo.",
    { cause: lastError }
  );
}
