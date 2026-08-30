import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  alternates: { canonical: "/terminos" },
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-[28px] font-bold">Términos y condiciones</h1>
      <p className="mt-2 text-[18px] text-foreground/78">Última actualización: agosto de 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-[18px] leading-relaxed text-foreground/90">
        <p className="rounded border border-border bg-muted p-4 text-[16px] text-foreground/78">
          Esta página es una plantilla de referencia con la información básica que exige la
          normativa de comercio electrónico y defensa del consumidor en Argentina. Antes de
          publicarla en producción, hay que completarla con los datos reales de la empresa
          (razón social, CUIT y domicilio legal) y que un abogado la revise.
        </p>

        <section>
          <h2 className="font-display text-[22px] text-foreground">1. Quiénes somos</h2>
          <p className="mt-2">
            Este sitio es operado por Epic Shine (Detailing Mode), [Razón social a completar],
            CUIT [a completar], con domicilio legal en [domicilio a completar], Argentina. Podés
            contactarnos por Instagram (@epic_shine.vm) o por los medios que figuren en la tienda.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">2. Objeto</h2>
          <p className="mt-2">
            Estos términos regulan la compra de productos de detailing y cuidado automotor a
            través de este sitio. Al confirmar una compra, aceptás estas condiciones.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">3. Precios y medios de pago</h2>
          <p className="mt-2">
            Los precios se muestran en pesos argentinos e incluyen los impuestos aplicables.
            Podés pagar con Mercado Pago, efectivo o transferencia (coordinado al confirmar el
            pedido). Los precios pueden actualizarse sin aviso previo; el precio válido es el
            vigente al momento de confirmar la compra.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">4. Entrega</h2>
          <p className="mt-2">
            Podés elegir retiro en el local o envío a domicilio. El costo de envío se calcula
            según el peso de la compra y se muestra antes de confirmar el pedido. Los plazos de
            entrega se coordinan por WhatsApp o email una vez confirmado el pago.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">5. Defensa del consumidor</h2>
          <p className="mt-2">
            Como consumidor, tenés los derechos previstos en la Ley 24.240 de Defensa del
            Consumidor, incluido el derecho de arrepentimiento en las compras a distancia (ver
            nuestra{" "}
            <a href="/devoluciones" className="underline underline-offset-4">
              Política de cambios y devoluciones
            </a>
            ). Ante cualquier reclamo, también podés recurrir a la Dirección Nacional de Defensa
            del Consumidor.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">6. Propiedad intelectual</h2>
          <p className="mt-2">
            Las marcas, logos, textos e imágenes de este sitio son propiedad de Epic Shine o de
            sus proveedores y no pueden reproducirse sin autorización.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">7. Modificaciones</h2>
          <p className="mt-2">
            Podemos actualizar estos términos en cualquier momento; los cambios rigen desde su
            publicación en esta página.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">8. Jurisdicción</h2>
          <p className="mt-2">
            Estos términos se rigen por las leyes de la República Argentina. Cualquier
            controversia se someterá a los tribunales ordinarios competentes del domicilio de la
            empresa, sin perjuicio de las normas de protección al consumidor que te sean
            aplicables.
          </p>
        </section>
      </div>
    </div>
  );
}
