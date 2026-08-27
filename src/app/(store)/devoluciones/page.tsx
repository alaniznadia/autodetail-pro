import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cambios y devoluciones",
  alternates: { canonical: "/devoluciones" },
};

export default function ReturnsPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-2xl font-bold">Cambios y devoluciones</h1>
      <p className="mt-2 text-sm text-foreground/60">Última actualización: agosto de 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <p className="rounded border border-border bg-muted p-4 text-xs text-foreground/60">
          Esta página es una plantilla de referencia basada en el derecho de arrepentimiento de
          la Ley 24.240 y la Resolución 424/2020. Antes de publicarla en producción conviene que
          la revise un abogado.
        </p>

        <section>
          <h2 className="font-display text-lg text-foreground">
            Derecho de arrepentimiento (compras online)
          </h2>
          <p className="mt-2">
            Si compraste a través del sitio (no en el local), tenés 10 días corridos desde que
            recibís el producto para arrepentirte de la compra y devolverlo, sin necesidad de dar
            ningún motivo, según el artículo 34 de la Ley 24.240. El producto tiene que estar sin
            usar y en su envase original.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-foreground">Cómo pedir un cambio o devolución</h2>
          <p className="mt-2">
            Escribinos por Instagram (@epic_shine.vm) o por los medios de contacto de la tienda
            indicando el número de pedido (lo encontrás en la confirmación que te enviamos por
            email o en{" "}
            <a href="/mi-cuenta" className="underline underline-offset-4">
              Mi cuenta
            </a>
            ) y el motivo. Te vamos a confirmar los pasos a seguir para la devolución.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-foreground">Producto con fallas o defectuoso</h2>
          <p className="mt-2">
            Si el producto llega dañado, con una falla de fabricación o no corresponde a lo que
            pediste, te lo cambiamos sin cargo o te reintegramos el importe, según prefieras.
            Conservá el packaging y sacá fotos del problema para agilizar el reclamo.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-foreground">Costos de envío en la devolución</h2>
          <p className="mt-2">
            Si te arrepentís de una compra sin que haya un defecto en el producto, el costo del
            envío de vuelta corre por tu cuenta. Si el problema es nuestro (producto defectuoso,
            error en el pedido), el envío de cambio o devolución lo cubrimos nosotros.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-foreground">Reintegro</h2>
          <p className="mt-2">
            Una vez que recibimos y verificamos el producto devuelto, procesamos el reintegro por
            el mismo medio de pago original en un plazo de hasta 10 días hábiles.
          </p>
        </section>

        <section>
          <h2 className="font-display text-lg text-foreground">Compras en el local</h2>
          <p className="mt-2">
            Para compras hechas en el local (POS), consultanos directamente en el mostrador sobre
            cambios; se evalúan caso por caso dentro de los primeros 10 días con el producto sin
            usar y el ticket de compra.
          </p>
        </section>
      </div>
    </div>
  );
}
