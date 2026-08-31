import type ExcelJS from "exceljs";

// exceljs y pdf-parse se importan de forma perezosa (adentro de las
// funciones que los usan) en vez de al tope del archivo: así, si alguna de
// las dos falla al cargar en el entorno de producción, no se cae todo este
// módulo (y con él, cualquier ruta que lo importe, como la plantilla o el
// parseo de CSV, que no dependen de ninguna de las dos).

export class UnsupportedFileError extends Error {}

// ---------------------------------------------------------------------------
// Lectura de archivo -> matriz de celdas (string[][], primera fila = header)
// ---------------------------------------------------------------------------

// No restringimos por extensión (el selector de archivo acepta cualquier
// tipo): el formato real se detecta por los primeros bytes del archivo, así
// funciona aunque el usuario suba un CSV con otra extensión o sin extensión.
export async function extractRowsFromFile(file: File): Promise<string[][]> {
  const buffer = Buffer.from(await file.arrayBuffer());

  if (buffer.length === 0) {
    throw new UnsupportedFileError("El archivo está vacío.");
  }
  if (isPdf(buffer)) return readPdfRows(buffer);
  if (isOldExcelOrOffice(buffer)) {
    throw new UnsupportedFileError(
      "Ese formato (Excel viejo .xls u otro documento de Office) no se puede leer directo. Volvé a guardarlo como .xlsx o CSV y subilo de nuevo."
    );
  }
  if (isZip(buffer)) {
    try {
      return await readExcelRows(buffer);
    } catch {
      throw new UnsupportedFileError(
        "No se pudo leer el archivo como Excel (.xlsx). Volvé a guardarlo como .xlsx o CSV y subilo de nuevo."
      );
    }
  }

  // Cualquier otra cosa: se intenta como texto delimitado (CSV/TSV/etc.).
  return parseCsv(buffer.toString("utf-8"));
}

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 4).toString("latin1") === "%PDF";
}

// Firma ZIP: la usan tanto .xlsx como .docx/.pptx (todos son ZIP por dentro).
function isZip(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

// Firma OLE2 (Compound File Binary): la usan los Excel/Word/PowerPoint
// viejos (.xls, .doc, .ppt), formato binario que exceljs no puede leer.
function isOldExcelOrOffice(buffer: Buffer): boolean {
  const signature = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return buffer.length >= 8 && signature.every((byte, i) => buffer[i] === byte);
}

function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const delimiter = detectCsvDelimiter(clean);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];
    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && clean[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

function detectCsvDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const counts: Record<string, number> = {
    ",": (firstLine.match(/,/g) ?? []).length,
    ";": (firstLine.match(/;/g) ?? []).length,
    "\t": (firstLine.match(/\t/g) ?? []).length,
  };
  const [best] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return counts[best] > 0 ? best : ",";
}

// exceljs declara su propio `Buffer` local ("extends ArrayBuffer") en vez de
// usar el de Node, y con las libs de TS actuales un Buffer real no matchea
// esa forma (le "faltan" métodos de ArrayBuffer redimensionable). El cast
// evita ese choque de tipos; en runtime `load` acepta un Buffer normal.
type ExcelJsLoadInput = Parameters<InstanceType<typeof ExcelJS.Workbook>["xlsx"]["load"]>[0];

async function readExcelRows(buffer: Buffer): Promise<string[][]> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJsLoadInput);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: string[][] = [];
  sheet.eachRow((row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell) => {
      cells.push(excelCellToString(cell.value));
    });
    if (cells.some((c) => c.trim() !== "")) rows.push(cells);
  });
  return rows;
}

function excelCellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    if ("richText" in value) return value.richText.map((t) => t.text).join("");
    if ("result" in value) return String(value.result ?? "");
    if ("text" in value) return String((value as { text: unknown }).text ?? "");
  }
  return String(value);
}

// Los PDF no tienen filas/columnas reales: getTable() detecta tablas a
// partir de las líneas dibujadas (bordes). Si no hay una tabla con bordes
// visibles, probamos un heurístico de texto plano (separar por 2+ espacios,
// tabs, "|" o ";"), pero pdf.js normaliza los espacios del texto extraído
// y en la mayoría de los PDF sin bordes ese heurístico no logra separar
// columnas: si ninguno de los dos caminos encuentra al menos encabezado +
// una fila, avisamos en vez de devolver un resultado vacío o incorrecto.
async function readPdfRows(buffer: Buffer): Promise<string[][]> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  try {
    const tableResult = await parser.getTable();
    const tables =
      tableResult.mergedTables.length > 0
        ? tableResult.mergedTables
        : tableResult.pages.flatMap((p) => p.tables);
    const tableRows = tables.flatMap((table) => table).map((r) => r.map((c) => (c ?? "").trim()));
    if (tableRows.length >= 2) return tableRows;

    const textResult = await parser.getText();
    const textRows = textResult.text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        line
          .split(/\s{2,}|\t|;|\|/)
          .map((c) => c.trim())
          .filter((c) => c !== "")
      )
      .filter((r) => r.length > 1);
    if (textRows.length >= 2) return textRows;

    throw new UnsupportedFileError(
      "No se pudo detectar una tabla en el PDF. La lectura de PDF funciona con tablas dibujadas con bordes (por ejemplo, exportadas desde Excel). Probá exportando el archivo como CSV o Excel (.xlsx)."
    );
  } finally {
    await parser.destroy();
  }
}

// ---------------------------------------------------------------------------
// Mapeo de columnas -> campos del producto, validación y agrupación en
// productos con variantes (varias filas con el mismo "producto" pasan a
// ser variantes de un solo producto).
// ---------------------------------------------------------------------------

type CanonicalField =
  | "producto"
  | "marca"
  | "categoria"
  | "descripcion"
  | "sku"
  | "variante"
  | "precio"
  | "costo"
  | "stock"
  | "codigoBarras"
  | "activo";

const REQUIRED_FIELDS: CanonicalField[] = ["producto", "categoria", "sku", "precio"];

const FIELD_LABELS: Record<CanonicalField, string> = {
  producto: "producto",
  marca: "marca",
  categoria: "categoria",
  descripcion: "descripcion",
  sku: "sku",
  variante: "variante",
  precio: "precio",
  costo: "costo",
  stock: "stock",
  codigoBarras: "codigo_barras",
  activo: "activo",
};

const FIELD_ALIASES: Record<CanonicalField, string[]> = {
  producto: ["producto", "nombre", "nombre_producto", "product", "name"],
  marca: ["marca", "brand"],
  categoria: ["categoria", "category", "rubro"],
  descripcion: ["descripcion", "description", "detalle"],
  sku: ["sku", "codigo", "codigo_interno", "code"],
  variante: ["variante", "presentacion", "variant", "nombre_variante"],
  precio: ["precio", "precio_venta", "price"],
  costo: ["costo", "precio_costo", "cost", "costo_precio"],
  stock: ["stock", "cantidad", "stock_inicial", "qty", "quantity"],
  codigoBarras: ["codigo_barras", "barcode", "ean", "cod_barras"],
  activo: ["activo", "publicado", "active", "estado"],
};

export type BulkRowIssue = { row: number; message: string };

export type BulkVariantInput = {
  sourceRow: number;
  sku: string;
  name: string;
  price: number;
  costPrice?: number;
  barcode?: string;
  initialStock: number;
};

export type BulkProductGroup = {
  name: string;
  brand?: string;
  categoryId: string;
  categoryName: string;
  description?: string;
  active: boolean;
  variants: BulkVariantInput[];
};

export type BulkParseResult = {
  groups: BulkProductGroup[];
  errors: BulkRowIssue[];
  warnings: BulkRowIssue[];
  totalDataRows: number;
};

export type CategoryLookup = { id: string; name: string; slug: string };

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeHeader(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

const TRUE_VALUES = new Set(["si", "sí", "s", "true", "1", "activo", "x", "yes"]);
const FALSE_VALUES = new Set(["no", "n", "false", "0", "inactivo"]);

function parseBoolean(raw: string, fallback: boolean): boolean {
  const normalized = normalizeText(raw);
  if (normalized === "") return fallback;
  if (TRUE_VALUES.has(normalized)) return true;
  if (FALSE_VALUES.has(normalized)) return false;
  return fallback;
}

// Acepta tanto "1234.56" como el formato es-AR "1.234,56".
function parseMoney(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let s = trimmed.replace(/[^0-9,.-]/g, "");
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    s = s.lastIndexOf(",") > s.lastIndexOf(".")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseInteger(raw: string, fallback: number): number {
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  const n = parseMoney(trimmed);
  return n === null ? fallback : Math.round(n);
}

function buildHeaderIndex(headerRow: string[]): Partial<Record<CanonicalField, number>> {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const index: Partial<Record<CanonicalField, number>> = {};

  for (const field of Object.keys(FIELD_ALIASES) as CanonicalField[]) {
    const aliases = FIELD_ALIASES[field];
    const found = normalizedHeaders.findIndex((h) => aliases.includes(h));
    if (found !== -1) index[field] = found;
  }

  return index;
}

export function parseBulkUpload(
  rows: string[][],
  categories: CategoryLookup[]
): BulkParseResult {
  const errors: BulkRowIssue[] = [];
  const warnings: BulkRowIssue[] = [];

  if (rows.length === 0) {
    return { groups: [], errors: [{ row: 1, message: "El archivo está vacío." }], warnings, totalDataRows: 0 };
  }

  const [headerRow, ...dataRows] = rows;
  const headerIndex = buildHeaderIndex(headerRow);

  const missing = REQUIRED_FIELDS.filter((f) => headerIndex[f] === undefined);
  if (missing.length > 0) {
    return {
      groups: [],
      errors: [
        {
          row: 1,
          message: `Faltan columnas obligatorias: ${missing.map((f) => FIELD_LABELS[f]).join(", ")}.`,
        },
      ],
      warnings,
      totalDataRows: dataRows.length,
    };
  }

  const categoryById = new Map<string, string>();
  for (const cat of categories) {
    categoryById.set(normalizeText(cat.name), cat.id);
    categoryById.set(normalizeText(cat.slug), cat.id);
  }

  const cell = (row: string[], field: CanonicalField): string => {
    const idx = headerIndex[field];
    return idx === undefined ? "" : (row[idx] ?? "").trim();
  };

  const groups = new Map<string, BulkProductGroup>();
  const seenSkus = new Set<string>();

  dataRows.forEach((row, i) => {
    const rowNumber = i + 2; // fila 1 = encabezado
    if (row.every((c) => c.trim() === "")) return;

    const productName = cell(row, "producto");
    const categoriaRaw = cell(row, "categoria");
    const skuRaw = cell(row, "sku");
    const precioRaw = cell(row, "precio");

    if (!productName) {
      errors.push({ row: rowNumber, message: "Falta el nombre del producto." });
      return;
    }
    if (!skuRaw) {
      errors.push({ row: rowNumber, message: "Falta el SKU." });
      return;
    }
    const skuKey = normalizeText(skuRaw);
    if (seenSkus.has(skuKey)) {
      errors.push({ row: rowNumber, message: `SKU "${skuRaw}" repetido en el archivo.` });
      return;
    }

    const categoryId = categoryById.get(normalizeText(categoriaRaw));
    if (!categoryId) {
      errors.push({
        row: rowNumber,
        message: `La categoría "${categoriaRaw || "(vacía)"}" no existe. Creala primero desde el panel.`,
      });
      return;
    }

    const price = parseMoney(precioRaw);
    if (price === null || price <= 0) {
      errors.push({ row: rowNumber, message: `Precio inválido: "${precioRaw}".` });
      return;
    }

    const costRaw = cell(row, "costo");
    const cost = costRaw ? parseMoney(costRaw) : null;
    if (costRaw && cost === null) {
      warnings.push({ row: rowNumber, message: `Costo inválido ("${costRaw}"), se guardó sin costo.` });
    }

    seenSkus.add(skuKey);

    const groupKey = normalizeText(productName);
    let group = groups.get(groupKey);
    if (!group) {
      group = {
        name: productName,
        brand: cell(row, "marca") || undefined,
        categoryId,
        categoryName: categoriaRaw,
        description: cell(row, "descripcion") || undefined,
        active: parseBoolean(cell(row, "activo"), true),
        variants: [],
      };
      groups.set(groupKey, group);
    } else if (group.categoryId !== categoryId) {
      warnings.push({
        row: rowNumber,
        message: `"${productName}" ya tenía la categoría "${group.categoryName}"; se ignoró "${categoriaRaw}" de esta fila.`,
      });
    }

    group.variants.push({
      sourceRow: rowNumber,
      sku: skuRaw,
      name: cell(row, "variante") || "Único",
      price,
      costPrice: cost ?? undefined,
      barcode: cell(row, "codigoBarras") || undefined,
      initialStock: parseInteger(cell(row, "stock"), 0),
    });
  });

  return { groups: Array.from(groups.values()), errors, warnings, totalDataRows: dataRows.length };
}

export const BULK_TEMPLATE_HEADERS = [
  "producto",
  "marca",
  "categoria",
  "descripcion",
  "sku",
  "variante",
  "precio",
  "costo",
  "stock",
  "codigo_barras",
  "activo",
];
