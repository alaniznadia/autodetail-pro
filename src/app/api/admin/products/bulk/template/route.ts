import { NextResponse } from "next/server";
import { BULK_TEMPLATE_HEADERS } from "@/lib/bulk-products";

// Sin esto, Next.js puede tratar este handler como estático (no lee nada
// del request) y cachear la respuesta al build, lo que puede romper la
// descarga en producción. Forzamos que se genere en cada request.
export const dynamic = "force-dynamic";

const EXAMPLE_ROWS = [
  ["Shampoo pH Neutro", "Detailer Pro", "Limpieza", "Shampoo para lavado a mano", "SH-500", "500 ml", "5500", "3200", "20", "7791234500001", "si"],
  ["Shampoo pH Neutro", "Detailer Pro", "Limpieza", "Shampoo para lavado a mano", "SH-1000", "1 L", "9800", "5900", "10", "7791234500002", "si"],
  ["Cera en Pasta", "Detailer Pro", "Protección", "", "CP-200", "Único", "8900", "5100", "15", "", "si"],
];

function csvField(value: string): string {
  if (/[;"\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function row(values: string[]): string {
  return values.map(csvField).join(";") + "\r\n";
}

export async function GET() {
  let csv = "﻿"; // BOM: para que Excel detecte UTF-8 y no rompa tildes/ñ
  csv += row(BULK_TEMPLATE_HEADERS);
  for (const example of EXAMPLE_ROWS) csv += row(example);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="plantilla-carga-masiva-productos.csv"',
    },
  });
}
