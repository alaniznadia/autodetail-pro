import { Prisma } from "@prisma/client";

/**
 * Evita crear un pedido/venta duplicado cuando el mismo request llega dos
 * veces (doble clic, o el cliente reintenta porque no vio la respuesta a
 * tiempo aunque el servidor sí haya terminado). Si ya existe un registro
 * con esa idempotencyKey, se devuelve ese en vez de procesar de nuevo.
 *
 * También cubre la carrera entre dos requests casi simultáneos con la
 * misma clave: si ambos pasan el chequeo inicial, la restricción unique
 * de la base deja pasar solo a uno, y el otro recibe P2002 acá, que se
 * traduce en "buscá el que ya se creó" en vez de un error.
 */
export async function withIdempotency<T>(
  idempotencyKey: string | undefined,
  findExisting: () => Promise<T | null>,
  run: () => Promise<T>
): Promise<T> {
  if (idempotencyKey) {
    const existing = await findExisting();
    if (existing) return existing;
  }

  try {
    return await run();
  } catch (err) {
    const isDuplicateKey =
      idempotencyKey &&
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002" &&
      (err.meta?.target as string[] | undefined)?.includes("idempotencyKey");

    if (isDuplicateKey) {
      const existing = await findExisting();
      if (existing) return existing;
    }
    throw err;
  }
}
