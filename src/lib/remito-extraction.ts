import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export class RemitoExtractionError extends Error {}

const extractedItemSchema = z.object({
  rawName: z.string().min(1),
  quantity: z.number().positive(),
  unitCost: z.number().nonnegative().nullable(),
  sku: z.string().nullable().optional(),
  barcode: z.string().nullable().optional(),
});

const extractionResultSchema = z.object({
  supplierName: z.string().nullable(),
  documentDate: z.string().nullable(), // como viene en el documento, sin parsear
  items: z.array(extractedItemSchema),
});

export type ExtractedRemitoItem = z.infer<typeof extractedItemSchema>;
export type RemitoExtractionResult = z.infer<typeof extractionResultSchema>;

const SYSTEM_PROMPT = `Sos un asistente que lee remitos de compra y tickets de proveedores (de una
tienda de productos de detailing automotor: ceras, shampoos, pulidoras, paños,
etc.) y extrae los ítems en JSON estructurado.

Reglas:
- Devolvé SOLO un objeto JSON válido, sin texto alrededor ni bloques de código.
- "items": un elemento por cada línea de producto (ignorá totales, subtotales,
  impuestos, descuentos y líneas de flete/envío que no sean un producto).
- "rawName": el nombre del producto tal como figura en el documento, sin
  inventar ni traducir nada.
- "quantity": cantidad numérica de esa línea. Si no se puede leer, usá 1.
- "unitCost": precio unitario (sin IVA si se distingue del precio con IVA,
  ya que es el costo que se usa para calcular margen). Si el documento solo
  trae el total de la línea y no el unitario, calculalo dividiendo por la
  cantidad. Si no hay ningún precio legible, usá null.
- "sku" y "barcode": solo si el documento efectivamente imprime un código de
  producto o de barras junto a esa línea; si no, null. No inventes códigos.
- "supplierName": nombre del proveedor/emisor del documento si figura, si no null.
- "documentDate": fecha del documento tal como está escrita, si figura, si no null.

Si la imagen o el PDF no es un remito o ticket de compra legible, devolvé
"items": [] en vez de inventar contenido.`;

const JSON_SCHEMA_HINT = `Formato de salida exacto:
{
  "supplierName": string | null,
  "documentDate": string | null,
  "items": [
    { "rawName": string, "quantity": number, "unitCost": number | null, "sku": string | null, "barcode": string | null }
  ]
}`;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new RemitoExtractionError(
      "Falta configurar ANTHROPIC_API_KEY para poder leer remitos automáticamente."
    );
  }
  return new Anthropic({ apiKey });
}

function extractJson(text: string): unknown {
  // El modelo puede devolver el JSON envuelto en ```json ... ``` a pesar de
  // la instrucción; buscamos el primer bloque { ... } balanceado como red
  // de seguridad antes de tirar error de formato.
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new RemitoExtractionError("La IA no devolvió un JSON válido.");
    }
    return JSON.parse(match[0]);
  }
}

/**
 * Envía el remito (PDF o foto) a Claude con visión y devuelve los ítems
 * detectados, listos para pasar por el matching contra el catálogo.
 */
export async function extractRemitoItems(
  fileBytes: Buffer,
  mimeType: string
): Promise<RemitoExtractionResult> {
  const client = getClient();
  const base64 = fileBytes.toString("base64");

  const documentBlock: Anthropic.Messages.ContentBlockParam =
    mimeType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mimeType as "image/jpeg" | "image/png" | "image/webp",
            data: base64,
          },
        };

  let response;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [documentBlock, { type: "text", text: JSON_SCHEMA_HINT }],
        },
      ],
    });
  } catch (err) {
    throw new RemitoExtractionError(
      err instanceof Error ? `No se pudo leer el remito: ${err.message}` : "No se pudo leer el remito."
    );
  }

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new RemitoExtractionError("La IA no devolvió texto para el remito.");
  }

  const json = extractJson(textBlock.text);
  const parsed = extractionResultSchema.safeParse(json);
  if (!parsed.success) {
    throw new RemitoExtractionError("La respuesta de la IA no tiene el formato esperado.");
  }

  return parsed.data;
}
