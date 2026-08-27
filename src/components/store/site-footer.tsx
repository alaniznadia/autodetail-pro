export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-foreground/70">
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
        <p className="mt-6 text-xs text-foreground/50">
          © {new Date().getFullYear()} Epic Shine. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
