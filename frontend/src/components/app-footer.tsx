type AppFooterProps = {
  compact?: boolean;
};

export function AppFooter({ compact = false }: AppFooterProps) {
  if (compact) {
    return (
      <footer className="px-1 py-2 text-[11px] font-semibold text-slate-500">
        <div className="flex items-center justify-center gap-2 whitespace-nowrap">
          <img
            src="/BadakBizz.jpeg"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="h-5 w-5 shrink-0 rounded-md object-cover shadow-sm shadow-primary/20"
          />
          <span className="font-bold text-slate-700">BadakBizz POS</span>
          <span aria-hidden="true" className="text-slate-300">•</span>
          <span>{"\u00A9"} 2026</span>
          <span aria-hidden="true" className="hidden text-slate-300 min-[360px]:inline">•</span>
          <span className="hidden text-slate-400 min-[360px]:inline">v0.1.0</span>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-8 border-t border-slate-200/70 px-1 py-5 text-xs text-slate-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <img
            src="/BadakBizz.jpeg"
            alt="BadakBizz Logo"
            loading="lazy"
            decoding="async"
            className="h-7 w-7 shrink-0 rounded-md object-cover shadow-sm shadow-primary/20"
          />
          <div className="min-w-0">
            <p className="truncate font-bold text-slate-700">BadakBizz POS</p>
            <p className="truncate">Solusi Andal untuk Bisnis Anda</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-medium text-slate-400">
          <span>{"\u00A9"} 2026 BadakBizz</span>
          <span className="hidden h-3 w-px bg-slate-200 sm:inline-block" />
          <span>v0.1.0</span>
        </div>
      </div>
    </footer>
  );
}
