import Link from "next/link";
import { NewsletterForm } from "@/components/store/newsletter-form";

const LEGAL_LINKS = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/privacidad", label: "Privacidad" },
  { href: "/devoluciones", label: "Cambios y devoluciones" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-foreground/85">
        <p className="font-display text-lg text-foreground">Epic Shine</p>
        <p className="mt-1">Detailing Mode — cuidado y estética automotor.</p>
        <p className="mt-4">
          Seguinos en Instagram:{" "}
          <a
            href="https://www.instagram.com/epic_shine.vm"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground"
          >
            @epic_shine.vm
          </a>
        </p>
        <div className="mt-6">
          <p className="font-display text-xs text-foreground/62">Novedades y promos por email</p>
          <div className="mt-2">
            <NewsletterForm />
          </div>
        </div>
        <nav aria-label="Legales" className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="underline underline-offset-4 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 text-xs text-foreground/70">
          © {new Date().getFullYear()} Epic Shine. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
