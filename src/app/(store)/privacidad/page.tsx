import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de privacidad",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-[28px] font-bold">Política de privacidad</h1>
      <p className="mt-2 text-[18px] text-foreground/78">Última actualización: agosto de 2026</p>

      <div className="mt-8 flex flex-col gap-6 text-[18px] leading-relaxed text-foreground/90">
        <p className="rounded border border-border bg-muted p-4 text-[16px] text-foreground/78">
          Esta página es una plantilla de referencia basada en la Ley 25.326 de Protección de
          Datos Personales. Antes de publicarla en producción conviene que la revise un abogado y
          se complete con los datos reales de la empresa.
        </p>

        <section>
          <h2 className="font-display text-[22px] text-foreground">1. Qué datos recolectamos</h2>
          <p className="mt-2">
            Cuando comprás o creás una cuenta, guardamos tu nombre, email, teléfono y, si elegís
            envío a domicilio, tu dirección. Si comprás como invitado, solo usamos esos datos para
            gestionar ese pedido puntual.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">2. Para qué los usamos</h2>
          <p className="mt-2">
            Usamos tus datos para procesar el pedido, coordinar el envío o retiro, enviarte
            confirmaciones y actualizaciones de estado por email, y responder tus consultas. No
            los usamos para enviarte publicidad sin tu consentimiento.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">3. Con quién los compartimos</h2>
          <p className="mt-2">
            Compartimos los datos estrictamente necesarios con Mercado Pago para procesar el pago
            cuando elegís esa opción, y con el correo o transporte elegido cuando corresponde
            hacer un envío. No vendemos ni cedemos tus datos a terceros con fines comerciales.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">4. Tus derechos (ARCO)</h2>
          <p className="mt-2">
            De acuerdo a la Ley 25.326, podés acceder, rectificar, actualizar o pedir la
            supresión de tus datos personales en cualquier momento. Si tenés una cuenta, podés ver
            y actualizar algunos de tus datos desde{" "}
            <a href="/mi-cuenta" className="underline underline-offset-4">
              Mi cuenta
            </a>
            , o escribirnos por los medios de contacto de la tienda para cualquier otro pedido.
            La Agencia de Acceso a la Información Pública, en su carácter de Órgano de Control de
            la Ley 25.326, tiene la atribución de atender las denuncias y reclamos que se
            interpongan con relación al incumplimiento de las normas sobre protección de datos
            personales.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">5. Cookies y almacenamiento local</h2>
          <p className="mt-2">
            El carrito de compras se guarda en el almacenamiento local de tu navegador
            (localStorage), no en cookies de seguimiento. Usamos una cookie técnica de sesión
            para mantenerte identificado cuando iniciás sesión, necesaria para el funcionamiento
            del sitio.
          </p>
        </section>

        <section>
          <h2 className="font-display text-[22px] text-foreground">6. Seguridad</h2>
          <p className="mt-2">
            Tu contraseña se guarda encriptada y nunca en texto plano. Los pagos con Mercado Pago
            se procesan en la plataforma de Mercado Pago; este sitio no almacena datos de tarjetas.
          </p>
        </section>
      </div>
    </div>
  );
}
