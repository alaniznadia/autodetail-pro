"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VariantForm = {
  id?: string;
  sku: string;
  name: string;
  price: string;
  costPrice: string;
  barcode: string;
  stock: string;
};

type Category = { id: string; name: string };

type ProductFormValues = {
  id?: string;
  name: string;
  brand: string;
  categoryId: string;
  description: string;
  active: boolean;
  variants: VariantForm[];
};

const emptyVariant: VariantForm = {
  sku: "",
  name: "",
  price: "",
  costPrice: "",
  barcode: "",
  stock: "0",
};

export function ProductForm({
  categories,
  initial,
}: {
  categories: Category[];
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const [values, setValues] = useState<ProductFormValues>(
    initial ?? {
      name: "",
      brand: "",
      categoryId: categories[0]?.id ?? "",
      description: "",
      active: true,
      variants: [emptyVariant],
    }
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateVariant(index: number, patch: Partial<VariantForm>) {
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, ...patch } : v)),
    }));
  }

  function addVariant() {
    setValues((prev) => ({ ...prev, variants: [...prev.variants, emptyVariant] }));
  }

  function removeVariant(index: number) {
    setValues((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: values.name,
      brand: values.brand || undefined,
      categoryId: values.categoryId,
      description: values.description || undefined,
      active: values.active,
      variants: values.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        name: v.name,
        price: Number(v.price),
        costPrice: v.costPrice ? Number(v.costPrice) : undefined,
        barcode: v.barcode || undefined,
        ...(isEdit ? { stock: Number(v.stock) } : { initialStock: Number(v.stock) }),
      })),
    };

    const res = await fetch(isEdit ? `/api/admin/products/${initial!.id}` : "/api/admin/products", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSubmitting(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        typeof data.error === "string" ? data.error : "No se pudo guardar el producto."
      );
      return;
    }

    router.push("/admin/productos");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex max-w-3xl flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block font-display text-sm">
            Nombre
          </label>
          <input
            id="name"
            required
            value={values.name}
            onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="brand" className="block font-display text-sm">
            Marca
          </label>
          <input
            id="brand"
            value={values.brand}
            onChange={(e) => setValues((v) => ({ ...v, brand: e.target.value }))}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="category" className="block font-display text-sm">
            Categoría
          </label>
          <select
            id="category"
            required
            value={values.categoryId}
            onChange={(e) => setValues((v) => ({ ...v, categoryId: e.target.value }))}
            className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <input
            id="active"
            type="checkbox"
            checked={values.active}
            onChange={(e) => setValues((v) => ({ ...v, active: e.target.checked }))}
            className="h-4 w-4"
          />
          <label htmlFor="active" className="font-display text-sm">
            Publicado en la tienda
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="description" className="block font-display text-sm">
          Descripción
        </label>
        <textarea
          id="description"
          rows={4}
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          className="mt-1 w-full rounded border border-border bg-background px-3 py-2"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Variantes</h2>
          <button
            type="button"
            onClick={addVariant}
            className="text-sm underline underline-offset-4"
          >
            + Agregar variante
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-4">
          {values.variants.map((variant, index) => (
            <fieldset
              key={variant.id ?? index}
              className="grid gap-3 rounded border border-border p-4 sm:grid-cols-2 md:grid-cols-3"
            >
              <legend className="px-1 text-xs text-foreground/60">
                Variante {index + 1}
              </legend>
              <div>
                <label className="block text-xs text-foreground/60">SKU</label>
                <input
                  required
                  value={variant.sku}
                  onChange={(e) => updateVariant(index, { sku: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground/60">
                  Nombre (ej: 500 ml)
                </label>
                <input
                  required
                  value={variant.name}
                  onChange={(e) => updateVariant(index, { name: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground/60">Código de barras</label>
                <input
                  value={variant.barcode}
                  onChange={(e) => updateVariant(index, { barcode: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground/60">Precio de venta</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.price}
                  onChange={(e) => updateVariant(index, { price: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground/60">Costo</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.costPrice}
                  onChange={(e) => updateVariant(index, { costPrice: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                />
              </div>
              <div>
                <label className="block text-xs text-foreground/60">
                  Stock {isEdit ? "(sucursal principal)" : "inicial"}
                </label>
                <input
                  required
                  type="number"
                  min="0"
                  value={variant.stock}
                  onChange={(e) => updateVariant(index, { stock: e.target.value })}
                  className="mt-1 w-full rounded border border-border bg-background px-2 py-1.5"
                />
              </div>
              {values.variants.length > 1 && !variant.id && (
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="text-left text-xs text-red-400 underline underline-offset-4"
                >
                  Quitar variante
                </button>
              )}
            </fieldset>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded border border-accent px-6 py-2 font-display text-sm hover:bg-accent hover:text-background disabled:opacity-50"
      >
        {submitting ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
