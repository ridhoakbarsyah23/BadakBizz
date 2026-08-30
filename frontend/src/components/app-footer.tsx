export function AppFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200/70 px-1 py-5 text-xs text-slate-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="/BadakBizz.jpeg"
            alt="BadakBizz Logo"
            className="h-7 w-7 shrink-0 rounded-md object-cover shadow-sm shadow-primary/20"
          />
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-700">BadakBizz POS</p>
            <p className="truncate">Your Biz, But Stronger</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-slate-400">
          <span>© 2026 BadakBizz</span>
          <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
