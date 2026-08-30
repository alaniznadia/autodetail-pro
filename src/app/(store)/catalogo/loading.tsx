export default function CatalogLoading() {
  return (
    <div className="mx-auto max-w-[1240px] animate-pulse px-4 pb-2 pt-8 sm:px-8">
      <div className="mb-4 h-3 w-40 rounded bg-surface" />
      <div className="mb-6 h-9 w-56 rounded bg-surface" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2.5">
            <div className="aspect-square rounded bg-surface" />
            <div className="h-4 w-3/4 rounded bg-surface" />
            <div className="h-3 w-1/2 rounded bg-surface" />
            <div className="h-5 w-1/3 rounded bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
