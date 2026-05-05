function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />;
}

export default function TaskDetailLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-8 h-3 w-28" />
        <Skeleton className="mt-2 h-9 w-72" />
        <Skeleton className="mt-4 h-4 w-[32rem]" />

        <section className="mt-12">
          <Skeleton className="h-6 w-16" />

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-10 min-w-[18rem] flex-1" />
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-56" />
              <Skeleton className="h-10 w-36" />
              <Skeleton className="h-10 w-40" />
            </div>
          </div>

          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <div className="grid min-w-[56rem] grid-cols-6 gap-0">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={`h-${i}`} className="h-11 rounded-none border-b border-gray-200" />
                ))}
                {Array.from({ length: 24 }).map((_, i) => (
                  <Skeleton key={`r-${i}`} className="h-14 rounded-none border-b border-gray-100" />
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
