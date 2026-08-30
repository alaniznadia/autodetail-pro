export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-[1240px] animate-pulse px-4 pb-14 pt-6 sm:px-8">
      <div className="mb-6 h-3 w-64 rounded bg-surface" />
      <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
        <div className="aspect-square w-full max-w-[520px] rounded bg-surface" />
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="h-3 w-24 rounded bg-surface" />
          <div className="h-9 w-3/4 rounded bg-surface" />
          <div className="h-4 w-1/2 rounded bg-surface" />
          <div className="h-20 w-full max-w-[520px] rounded bg-surface" />
          <div className="h-11 w-full max-w-xs rounded bg-surface" />
        </div>
      </div>
    </div>
  );
}
