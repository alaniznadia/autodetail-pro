"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type RowIssue = { row: number; message: string };

type PreviewVariant = {
  sourceRow: number;
  sku: string;
  name: string;
  price: number;
  costPrice?: number;
  initialStock: number;
};

type PreviewGroup = {
  name: string;
  brand?: string;
  categoryName: string;
  categoryIsNew: boolean;
  active: boolean;
  variants: PreviewVariant[];
};

type PreviewResponse = {
  groups: PreviewGroup[];
  errors: RowIssue[];
  warnings: RowIssue[];
  totalDataRows: number;
  productCount: number;
  variantCount: number;
};

type CommitResponse = {
  created: number;
  createdProducts: { id: string; name: string }[];
  createdCategories: string[];
  failed: { name: string; error: string }[];
  errors: RowIssue[];
  warnings: RowIssue[];
};

export function BulkProductUpload() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  function resetForNewFile() {
    setPreview(null);
    setResult(null);
    setError(null);
  }

  async function downloadTemplate() {
    setDownloadingTemplate(true);
    setTemplateError(null);

    try {
      const res = await fetch("/api/admin/products/bulk/template");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const detail = typeof data?.error === "string" ? data.error : `código ${res.status}`;
        setTemplateError(`No se pudo descargar la plantilla (${detail}). Probá de nuevo.`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "plantilla-carga-masiva-productos.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setTemplateError("No se pudo descargar la plantilla. Probá de nuevo.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  async function submit(mode: "preview" | "commit") {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Elegí un archivo primero.");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const res = await fetch("/api/admin/products/bulk", { method: "POST", body: formData });
    const data = await res.json().catch(() => ({}));

    setLoading(false);

    if (!res.ok) {
      setError(
        typeof data.error === "string"
          ? data.error
          : `No se pudo procesar el archivo (código ${res.status}). Probá de nuevo.`
      );
      return;
    }

    if (mode === "preview") {
      setPreview(data as PreviewResponse);
    } else {
      setResult(data as CommitResponse);
      setPreview(null);
      router.refresh();
    }
  }

  return (
    <div className="mt-6 flex max-w-3xl flex-col gap-6">
      <div className="rounded border border-border p-4">
        <p className="text-sm text-foreground/70">
          Subí cualquier archivo con tus productos: CSV, Excel (.xlsx), PDF, texto delimitado, etc.
          (el formato se detecta solo, no hace falta que tenga una extensión en particular). Cada
          fila es una variante; filas con el mismo nombre de producto se agrupan como variantes de
          un mismo producto. Las columnas obligatorias son <strong>producto</strong>,{" "}
          <strong>categoria</strong> y <strong>precio</strong>. Si la categoría no existe todavía
          en el panel, se crea sola al confirmar la carga. También se reconocen: marca,
          descripcion, sku (si no viene, se genera uno automático a partir del nombre), variante,
          costo, stock, codigo_barras y activo. En PDF solo se pueden leer
          tablas dibujadas con bordes (por ejemplo, exportadas desde Excel); si el PDF no tiene una
          tabla así, usá CSV o Excel. El archivo no puede pesar más de 4 MB.
        </p>
        <button
          type="button"
          disabled={downloadingTemplate}
          onClick={downloadTemplate}
          className="mt-2 text-sm underline underline-offset-4 disabled:opacity-50"
        >
          {downloadingTemplate ? "Descargando..." : "Descargar plantilla CSV de ejemplo"}
        </button>
        {templateError && (
          <p role="alert" className="mt-1 text-sm text-red-400">
            {templateError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="bulk-file" className="block text-sm">
            Archivo
          </label>
          <input
            id="bulk-file"
            ref={fileInputRef}
            type="file"
            onChange={(e) => {
              setFileName(e.target.files?.[0]?.name ?? null);
              resetForNewFile();
            }}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={loading || !fileName}
          onClick={() => submit("preview")}
          className="rounded border border-accent px-4 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Previsualizar"}
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      {preview && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-foreground/70">
            {preview.totalDataRows} filas leídas · {preview.productCount} productos ·{" "}
            {preview.variantCount} variantes listas para crear.
          </p>

          {preview.errors.length > 0 && (
            <div className="rounded border border-red-400/40 p-3">
              <p className="font-display text-sm text-red-400">
                {preview.errors.length} filas con errores (no se van a crear)
              </p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-red-400">
                {preview.errors.map((e, i) => (
                  <li key={i}>
                    Fila {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <div className="rounded border border-yellow-500/40 p-3">
              <p className="font-display text-sm text-yellow-600">Avisos</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-yellow-600">
                {preview.warnings.map((w, i) => (
                  <li key={i}>
                    Fila {w.row}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.groups.length > 0 && (
            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b border-border text-foreground/60">
                  <tr>
                    <th className="p-3 font-display font-normal">Producto</th>
                    <th className="p-3 font-display font-normal">Categoría</th>
                    <th className="p-3 font-display font-normal">Variantes</th>
                    <th className="p-3 font-display font-normal">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.groups.map((g, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="p-3">{g.name}</td>
                      <td className="p-3">
                        {g.categoryName}
                        {g.categoryIsNew && (
                          <span className="ml-2 text-xs text-yellow-600">(nueva)</span>
                        )}
                      </td>
                      <td className="p-3">{g.variants.length}</td>
                      <td className="p-3">{g.active ? "Activo" : "Inactivo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.groups.length > 0 && (
            <button
              type="button"
              disabled={loading}
              onClick={() => submit("commit")}
              className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
            >
              {loading ? "Creando..." : `Confirmar carga de ${preview.productCount} productos`}
            </button>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-3 rounded border border-border p-4">
          <p className="font-display text-sm">
            Se crearon {result.created} de {result.created + result.failed.length} productos.
          </p>
          {result.createdCategories.length > 0 && (
            <p className="text-sm text-foreground/70">
              Categorías nuevas creadas: {result.createdCategories.join(", ")}.
            </p>
          )}
          {result.failed.length > 0 && (
            <ul className="flex flex-col gap-1 text-sm text-red-400">
              {result.failed.map((f, i) => (
                <li key={i}>
                  {f.name}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
