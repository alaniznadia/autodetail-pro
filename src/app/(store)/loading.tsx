export default function StoreLoading() {
  return (
    <div
      role="status"
      aria-label="Cargando"
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4 py-20 text-foreground/60"
    >
      <span
        aria-hidden="true"
        className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
      />
      <p className="font-display text-sm">Cargando...</p>
    </div>
  );
}
