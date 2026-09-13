"use client"

import { apiUrl } from "@/lib/api"
import { AutoDismissNotice } from "@/components/auto-dismiss-notice"
import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAuth } from "@/context/AuthContext"
import { AlertCircle, CalendarDays, Download, Loader2, RefreshCw, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const salesConfig = {
  sales: {
    label: "Penjualan",
    color: "hsl(var(--primary))",
  },
  profit: {
    label: "Margin Produk",
    color: "#10b981",
  },
}

const dateRangeOptions = [
  { value: "today", label: "Hari Ini" },
  { value: "last_7_days", label: "7 Hari Terakhir" },
  { value: "last_30_days", label: "30 Hari Terakhir" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "this_year", label: "Tahun Ini" },
  { value: "single", label: "Tanggal Tertentu" },
  { value: "custom", label: "Rentang Tanggal" },
]

const formatInputDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const formatReadableDate = (dateString: string) => {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const resolveDateRange = (dateRange: string, startDate: string, endDate: string) => {
  const now = new Date()
  const today = formatInputDate(now)

  if (dateRange === "today") return { start: today, end: today }
  if (dateRange === "last_7_days") {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    return { start: formatInputDate(start), end: today }
  }
  if (dateRange === "last_30_days") {
    const start = new Date(now)
    start.setDate(now.getDate() - 29)
    return { start: formatInputDate(start), end: today }
  }
  if (dateRange === "this_month") {
    return { start: formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: today }
  }
  if (dateRange === "this_year") {
    return { start: formatInputDate(new Date(now.getFullYear(), 0, 1)), end: today }
  }
  if (dateRange === "single") return { start: startDate, end: startDate }
  if (dateRange === "custom") return { start: startDate, end: endDate || startDate }

  return { start: "", end: "" }
}

type ReportData = {
  totalRevenue: number | string
  totalTransactions: number
  averageTransaction: number | string
  totalProductMargin: number | string
  topSellingItem: { name: string; sold: number } | null
  busiestHour: string | null
  busiestHourCount: number
  chartData: Array<{ label: string; sales: number; profit: number }>
  estimatedProfitItemCount: number
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState("this_month")
  const [startDate, setStartDate] = useState(formatInputDate(new Date()))
  const [endDate, setEndDate] = useState(formatInputDate(new Date()))
  const [isExporting, setIsExporting] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)
  const [appliedRange, setAppliedRange] = useState(() => ({
    ...resolveDateRange("this_month", formatInputDate(new Date()), formatInputDate(new Date())),
    option: "this_month",
  }))
  const [notice, setNotice] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const { token } = useAuth()

  const activeRange = appliedRange
  const activeRangeLabel = activeRange.start && activeRange.end
    ? activeRange.start === activeRange.end
      ? formatReadableDate(activeRange.start)
      : `${formatReadableDate(activeRange.start)} - ${formatReadableDate(activeRange.end)}`
    : "Semua tanggal"
  const selectedRangeLabel = dateRangeOptions.find((option) => option.value === appliedRange.option)?.label || "Periode Terpilih"

  const buildReportUrl = (path: string, includeExcelFormat = false) => {
    const params = new URLSearchParams()

    if (activeRange.start) params.set("start_date", activeRange.start)
    if (activeRange.end) params.set("end_date", activeRange.end)
    if (includeExcelFormat) {
      params.set("format", "excel")
      params.set("status", "COMPLETED")
    }

    const queryString = params.toString()
    return apiUrl(queryString ? `${path}?${queryString}` : path)
  }

  const handleExport = async () => {
    setNotice(null)

    try {
      setIsExporting(true)

      const res = await fetch(buildReportUrl("/api/reports/export", true), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) throw new Error("Laporan penjualan belum dapat diekspor.")

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const contentDisposition = res.headers.get("Content-Disposition") || ""
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `laporan_penjualan_${Date.now()}.xlsx`
      const a = document.createElement("a")

      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      a.remove()

      setNotice({
        type: "success",
        message: "Laporan transaksi selesai berhasil diekspor sesuai periode aktif.",
      })
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Laporan penjualan belum dapat diekspor.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true)
        setLoadError("")

        const res = await fetch(buildReportUrl("/api/reports"), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        })

        if (!res.ok) throw new Error("Data laporan belum dapat dimuat.")

        const jsonData = await res.json()
        setData(jsonData)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Data laporan belum dapat dimuat."
        setLoadError(message)
        setNotice({ type: "error", message })
      } finally {
        setIsLoading(false)
      }
    }

    if (token) fetchReports()
  }, [token, appliedRange.start, appliedRange.end, refreshKey])

  const applyFilters = () => {
    const nextRange = resolveDateRange(dateRange, startDate, endDate)

    if (!nextRange.start || !nextRange.end) {
      setNotice({ type: "error", message: "Pilih tanggal yang lengkap sebelum menerapkan filter." })
      return
    }
    if (nextRange.start > nextRange.end) {
      setNotice({ type: "error", message: "Tanggal awal tidak boleh melewati tanggal akhir." })
      return
    }

    setNotice(null)
    setAppliedRange({ ...nextRange, option: dateRange })
  }

  const resetFilters = () => {
    const today = formatInputDate(new Date())
    setDateRange("this_month")
    setStartDate(today)
    setEndDate(today)
    setNotice(null)
    setAppliedRange({ ...resolveDateRange("this_month", today, today), option: "this_month" })
  }

  const chartData = data?.chartData || []
  const hasChartActivity = chartData.some((item) => Number(item.sales) !== 0 || Number(item.profit) !== 0)
  const formatCurrency = (value: number | string | undefined) => `Rp ${Number(value || 0).toLocaleString("id-ID")}`

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Laporan Penjualan</h1>
        <p className="text-muted-foreground">
          Pantau penjualan, margin produk, dan pola transaksi dalam satu tampilan.
        </p>
      </div>

      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid min-w-0 flex-1 gap-3 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Periode
              </label>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                className="h-11 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {(dateRange === "single" || dateRange === "custom") ? (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    {dateRange === "single" ? "Tanggal" : "Dari Tanggal"}
                  </label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className="h-11 rounded-xl pl-9"
                    />
                  </div>
                </div>
                {dateRange === "custom" && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Sampai Tanggal
                    </label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(event) => setEndDate(event.target.value)}
                        className="h-11 rounded-xl pl-9"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Tanggal Aktif
                </label>
                <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                  {activeRangeLabel}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row xl:shrink-0">
            <Button onClick={resetFilters} variant="outline" className="h-11 w-full rounded-xl px-4 sm:w-auto">
              <RotateCcw className="mr-2 h-4 w-4" />
              Atur Ulang
            </Button>
            <Button onClick={applyFilters} variant="secondary" className="h-11 w-full rounded-xl px-5 sm:w-auto">
              Terapkan Filter
            </Button>
            <Button onClick={handleExport} className="h-11 w-full rounded-xl px-5 sm:w-auto" disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Ekspor Excel
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
            {selectedRangeLabel}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {activeRangeLabel}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Transaksi selesai
          </span>
        </div>
      </div>

      <AutoDismissNotice notice={notice} onDismiss={() => setNotice(null)} />

      {isLoading && data && (
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-500" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memperbarui laporan…
        </div>
      )}

      {isLoading && !data ? (
        <ReportSkeleton />
      ) : !data ? (
        <Card className="border-red-100 bg-red-50/60">
          <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <div>
              <p className="font-bold text-slate-900">Laporan belum dapat ditampilkan</p>
              <p className="mt-1 text-sm text-slate-600">{loadError || "Periksa koneksi, lalu coba kembali."}</p>
            </div>
            <Button variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Penjualan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.totalRevenue)}</div>
                <p className="text-xs text-muted-foreground">Dari transaksi selesai</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jumlah Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Number(data.totalTransactions || 0).toLocaleString("id-ID")}</div>
                <p className="text-xs text-muted-foreground">Transaksi selesai</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rata-rata Nilai Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data.averageTransaction)}</div>
                <p className="text-xs text-muted-foreground">Per transaksi selesai</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estimasi Margin Produk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700">{formatCurrency(data.totalProductMargin)}</div>
                <p className="text-xs text-muted-foreground">Sebelum diskon dan biaya operasional</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produk Terlaris</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate text-2xl font-bold" title={data.topSellingItem?.name || undefined}>
                  {data.topSellingItem?.name || "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.topSellingItem ? `${data.topSellingItem.sold} unit terjual` : "Belum ada penjualan"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jam Tersibuk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.busiestHour || "-"}</div>
                <p className="text-xs text-muted-foreground">
                  {Number(data.busiestHourCount || 0) > 0
                    ? `${Number(data.busiestHourCount).toLocaleString("id-ID")} transaksi pada periode ini`
                    : "Belum ada transaksi selesai"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Penjualan dan Margin Produk</CardTitle>
                <CardDescription>
                  Penjualan dibandingkan margin produk (harga jual dikurangi modal), sebelum diskon dan biaya operasional. Margin tidak termasuk pajak dan biaya layanan.
                </CardDescription>
                <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold text-slate-600" aria-label="Legenda grafik">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary" />Penjualan</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Margin Produk</span>
                </div>
                {data.estimatedProfitItemCount > 0 && (
                  <p className="text-sm text-amber-700" role="note">
                    Margin masih mencakup estimasi untuk {data.estimatedProfitItemCount} baris item transaksi lama yang belum memiliki catatan modal.
                    Estimasi memakai harga beli produk saat ini, atau nol jika produk sudah dihapus.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {hasChartActivity ? (
                  <ChartContainer config={salesConfig} className="min-h-[280px] w-full">
                    <BarChart data={chartData} margin={{ left: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(value) => `Rp ${Number(value).toLocaleString("id-ID", { notation: "compact" })}`} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value, name) => (
                        <div className="flex min-w-44 items-center justify-between gap-4">
                          <span className="text-muted-foreground">{salesConfig[name as keyof typeof salesConfig]?.label || String(name)}</span>
                          <span className="font-mono font-semibold">{formatCurrency(Number(value))}</span>
                        </div>
                      )} />} />
                      <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                      <Bar dataKey="profit" fill="var(--color-profit)" radius={4} />
                    </BarChart>
                  </ChartContainer>
                ) : <EmptyChart />}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tren Pendapatan</CardTitle>
                <CardDescription>
                  Pergerakan pendapatan selama periode yang dipilih.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasChartActivity ? (
                  <ChartContainer config={salesConfig} className="min-h-[280px] w-full">
                    <LineChart data={chartData} margin={{ left: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
                      <YAxis tickLine={false} axisLine={false} width={72} tickFormatter={(value) => `Rp ${Number(value).toLocaleString("id-ID", { notation: "compact" })}`} />
                      <ChartTooltip content={<ChartTooltipContent formatter={(value) => (
                        <div className="flex min-w-44 items-center justify-between gap-4">
                          <span className="text-muted-foreground">Penjualan</span>
                          <span className="font-mono font-semibold">{formatCurrency(Number(value))}</span>
                        </div>
                      )} />} />
                      <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ChartContainer>
                ) : <EmptyChart />}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-6 text-center">
      <AlertCircle className="mb-3 h-9 w-9 text-slate-400" />
      <p className="font-bold text-slate-800">Belum ada transaksi selesai</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">Pilih periode lain atau selesaikan transaksi untuk menampilkan grafik.</p>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Memuat laporan penjualan">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl border border-slate-200 bg-white" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-96 rounded-xl border border-slate-200 bg-white" />
        <div className="h-96 rounded-xl border border-slate-200 bg-white" />
      </div>
      <span className="sr-only">Laporan sedang dimuat.</span>
    </div>
  )
}
