/**
 * Skeleton loading components for polished loading states.
 */

function Pulse({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="app-shell">
      <div className="app-shell__grid fixed inset-0" />
      <div className="app-shell__content mx-auto max-w-7xl px-6 py-8">
        {/* Hero */}
        <div className="app-surface mb-6 rounded-2xl p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="mb-3 flex items-center gap-3">
                <Pulse className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Pulse className="h-3 w-20" />
                  <Pulse className="h-3 w-32" />
                </div>
              </div>
              <Pulse className="mb-2 h-8 w-48" />
              <Pulse className="h-4 w-80" />
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[28rem]">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <Pulse className="mb-2 h-3 w-16" />
                  <Pulse className="h-5 w-24" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="app-surface rounded-xl p-5">
              <div className="mb-5 flex items-center justify-between">
                <Pulse className="h-11 w-11 rounded-lg" />
                <Pulse className="h-8 w-14" />
              </div>
              <Pulse className="mb-2 h-3 w-24" />
              <Pulse className="h-4 w-48" />
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="app-surface overflow-hidden rounded-2xl lg:col-span-3 p-6">
            <Pulse className="mb-4 h-6 w-32" />
            <Pulse className="mb-3 h-4 w-full" />
            <Pulse className="mb-3 h-4 w-3/4" />
            <Pulse className="mb-3 h-4 w-5/6" />
            <Pulse className="mb-3 h-4 w-2/3" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="app-surface rounded-xl p-5">
                <Pulse className="mb-3 h-11 w-11 rounded-lg" />
                <Pulse className="mb-2 h-5 w-24" />
                <Pulse className="h-4 w-48" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="app-surface rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <Pulse className="h-6 w-6 rounded-full" />
            <div className="flex-1 space-y-2">
              <Pulse className="h-4 w-3/4" />
              <Pulse className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-[#24584b] border-t-transparent" />
        <p className="text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
