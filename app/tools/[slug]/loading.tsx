function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-200/70 ${className}`} />;
}

export default function ToolDetailLoading() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl space-y-10 p-8">
        <SkeletonBlock className="h-4 w-28" />

        <section className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <SkeletonBlock className="size-16 rounded-full" />
              <div className="space-y-3">
                <SkeletonBlock className="h-8 w-72" />
                <SkeletonBlock className="h-4 w-[28rem]" />
                <SkeletonBlock className="h-4 w-[22rem]" />
              </div>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <SkeletonBlock className="h-10 w-full sm:w-44" />
              <SkeletonBlock className="h-10 w-full sm:w-36" />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="h-6 w-40" />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
            <SkeletonBlock className="h-20" />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <SkeletonBlock className="h-8 w-28 rounded-full" />
            <SkeletonBlock className="h-8 w-24 rounded-full" />
            <SkeletonBlock className="h-8 w-32 rounded-full" />
            <SkeletonBlock className="h-8 w-20 rounded-full" />
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <SkeletonBlock className="h-6 w-44" />
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <SkeletonBlock className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <SkeletonBlock className="h-4 w-28" />
                <SkeletonBlock className="h-4 w-40" />
                <SkeletonBlock className="h-8 w-full" />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <SkeletonBlock className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-36" />
                <SkeletonBlock className="h-8 w-full" />
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <SkeletonBlock className="aspect-video w-full rounded-none" />
              <div className="space-y-2 p-4">
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-4 w-44" />
                <SkeletonBlock className="h-8 w-full" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
