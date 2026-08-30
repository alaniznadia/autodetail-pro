import { NextRequest, NextResponse } from "next/server";
import { getSalesReport, getStockValuation, getStockStatusBreakdown } from "@/lib/reports";

/**
 * Exporta el reporte del período como CSV con separador ";" (el que espera
 * Excel en configuración regional es-AR, donde "," ya es el separador
 * decimal). No usamos una librería de xlsx: la versión publicada en el
 * registro de npm tiene vulnerabilidades altas sin parchear ahí (SheetJS
 * dejó de publicar ahí las versiones arregladas), y un CSV bien armado
 * abre igual de bien en Excel/Sheets sin agregar esa dependencia.
 */

function csvField(value: string | number): string {
  const s = typeof value === "number" ? value.toLocaleString("es-AR", { minimumFractionDigits: 2 }) : value;
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(...fields: (string | number)[]): string {
  return fields.map(csvField).join(";") + "\r\n";
}

// Conteos (pedidos, cantidades, unidades) no llevan decimales; solo los
// montos en dinero. Se formatean antes para no pasar por csvField.
function int(n: number): string {
  return n.toLocaleString("es-AR");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const toParam = searchParams.get("to");
  const fromParam = searchParams.get("from");

  const to = toParam ? new Date(`${toParam}T23:59:59`) : new Date();
  const from = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [sales, stock, breakdown] = await Promise.all([
    getSalesReport(from, to),
    getStockValuation(),
    getStockStatusBreakdown(),
  ]);

  const fmtDate = (d: Date) => d.toLocaleDateString("es-AR");

  let csv = "﻿"; // BOM: para que Excel detecte UTF-8 y no rompa las tildes/ñ
  csv += row("Reporte Epic Shine");
  csv += row("Período", `${fmtDate(from)} a ${fmtDate(to)}`);
  csv += "\r\n";

  csv += row("Resumen de ventas");
  csv += row("Ventas totales", sales.totalRevenue);
  csv += row("Pedidos", int(sales.orderCount));
  csv += row("Ticket promedio", sales.averageTicket);
  csv += row("Ventas online", sales.onlineRevenue);
  csv += row("Ventas local (POS)", sales.posRevenue);
  csv += "\r\n";

  csv += row("Productos más vendidos", "", "Cantidad", "Ingresos");
  csv += row("Producto", "Variante", "Cantidad", "Ingresos");
  for (const p of sales.topProducts) {
    csv += row(p.name, p.variantName, int(p.quantity), p.revenue);
  }
  if (sales.topProducts.length === 0) csv += row("Sin ventas en este período.");
  csv += "\r\n";

  csv += row("Stock");
  csv += row("Unidades en stock", int(stock.totalUnits));
  csv += row("Valorizado a costo", stock.valuedAtCost);
  csv += row("Valorizado a precio de venta", stock.valuedAtPrice);
  csv += "\r\n";

  csv += row("Estado del stock (variante x sucursal)");
  csv += row("Disponible", int(breakdown.disponible));
  csv += row("Mínimo", int(breakdown.minimo));
  csv += row("Agotado", int(breakdown.agotado));
  csv += row("Sin control de stock", int(breakdown.sinControl));

  const filename = `reporte-epicshine_${from.toISOString().slice(0, 10)}_${to
    .toISOString()
    .slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
