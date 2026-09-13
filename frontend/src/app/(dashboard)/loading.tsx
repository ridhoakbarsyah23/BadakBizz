export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5" role="status" aria-label="Memuat halaman">
      <div className="space-y-2">
        <div className="h-8 w-52 rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-200/80" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>

      <div className="h-80 rounded-2xl border border-slate-200 bg-white" />
      <span className="sr-only">Konten sedang dimuat.</span>
    </div>
  )
}
