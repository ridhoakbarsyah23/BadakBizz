"use client"

import { apiUrl } from "@/lib/api"
import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAuth } from "@/context/AuthContext"
import { AlertTriangle, CalendarDays, CheckCircle2, Download, Loader2, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const salesConfig = {
  sales: {
    label: "Penjualan",
    color: "hsl(var(--primary))",
  },
  profit: {
    label: "Laba",
    color: "hsl(var(--destructive))",
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

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dateRange, setDateRange] = useState("this_month")
  const [startDate, setStartDate] = useState(formatInputDate(new Date()))
  const [endDate, setEndDate] = useState(formatInputDate(new Date()))
  const [isExporting, setIsExporting] = useState(false)
  const [notice, setNotice] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [isNoticeVisible, setIsNoticeVisible] = useState(false)
  const { token } = useAuth()

  useEffect(() => {
    if (!notice) return

    setIsNoticeVisible(true)

    const hideTimerId = window.setTimeout(() => {
      setIsNoticeVisible(false)
    }, 15000)

    const removeTimerId = window.setTimeout(() => {
      setNotice(null)
    }, 15300)

    return () => {
      window.clearTimeout(hideTimerId)
      window.clearTimeout(removeTimerId)
    }
  }, [notice])

  const getDateRange = () => {
    const now = new Date()
    const today = formatInputDate(now)

    if (dateRange === "today") {
      return { start: today, end: today }
    }

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

    if (dateRange === "single") {
      return startDate ? { start: startDate, end: startDate } : { start: "", end: "" }
    }

    if (dateRange === "custom") {
      return {
        start: startDate,
        end: endDate || startDate,
      }
    }

    return { start: "", end: "" }
  }

  const activeRange = getDateRange()
  const activeRangeLabel = activeRange.start && activeRange.end
    ? activeRange.start === activeRange.end
      ? formatReadableDate(activeRange.start)
      : `${formatReadableDate(activeRange.start)} - ${formatReadableDate(activeRange.end)}`
    : "Semua tanggal"
  const selectedRangeLabel = dateRangeOptions.find((option) => option.value === dateRange)?.label || "Pilih Periode"

  const buildReportUrl = (path: string, includeExcelFormat = false) => {
    const params = new URLSearchParams()

    if (activeRange.start) params.set("start_date", activeRange.start)
    if (activeRange.end) params.set("end_date", activeRange.end)
    if (includeExcelFormat) params.set("format", "excel")

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

      if (!res.ok) throw new Error("Gagal mengekspor laporan keuangan")

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const contentDisposition = res.headers.get("Content-Disposition") || ""
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `laporan_keuangan_${Date.now()}.xlsx`
      const a = document.createElement("a")

      a.href = downloadUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      a.remove()

      setNotice({
        type: "success",
        message: "Excel laporan keuangan berhasil diekspor sesuai periode aktif.",
      })
    } catch (err: any) {
      setNotice({
        type: "error",
        message: err.message || "Gagal mengekspor laporan keuangan.",
      })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true)

        const res = await fetch(buildReportUrl("/api/reports"), {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        })

        if (!res.ok) throw new Error("Gagal mengambil data laporan")

        const jsonData = await res.json()
        setData(jsonData)
      } catch (err: any) {
        setNotice({
          type: "error",
          message: err.message || "Gagal mengambil data laporan.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (token) fetchReports()
  }, [token, dateRange, startDate, endDate])

  const resetFilters = () => {
    setDateRange("this_month")
    setStartDate(formatInputDate(new Date()))
    setEndDate(formatInputDate(new Date()))
  }

  const chartData = data?.chartData || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Laporan Keuangan</h1>
        <p className="text-muted-foreground">
          Analitik dan wawasan untuk bisnis Anda.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 lg:grid-cols-[220px_minmax(260px,1fr)] lg:items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Periode
              </label>
              <select
                value={dateRange}
                onChange={(event) => setDateRange(event.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {(dateRange === "single" || dateRange === "custom") ? (
              <div className="grid gap-3 sm:grid-cols-2">
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
            <Button onClick={resetFilters} variant="outline" className="h-11 rounded-xl px-4">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button onClick={handleExport} className="h-11 rounded-xl px-5" disabled={isExporting}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Excel
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
        </div>
      </div>

      {notice && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-all duration-300 ease-out ${
          notice.type === "success"
            ? "border-green-200 bg-green-50 text-green-700"
            : "border-red-200 bg-red-50 text-red-700"
        } ${isNoticeVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>
          {notice.type === "success" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{notice.message}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {Number(data?.totalRevenue || 0).toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  Untuk periode yang dipilih
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rata-Rata Transaksi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {Number(data?.averageTransaction || 0).toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produk Terlaris</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="truncate text-2xl font-bold">
                  {data?.topSellingItem?.name || "-"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.topSellingItem ? `${data.topSellingItem.sold} unit terjual` : "Belum ada penjualan"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Jam Tersibuk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.busiestHour || "-"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Penjualan vs Laba</CardTitle>
                <CardDescription>
                  Perbandingan total pendapatan dan laba bersih.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={salesConfig} className="min-h-[280px] w-full">
                  <BarChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
                    <Bar dataKey="profit" fill="#10b981" radius={4} />
                  </BarChart>
                </ChartContainer>
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
                <ChartContainer config={salesConfig} className="min-h-[280px] w-full">
                  <LineChart data={chartData}>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="sales" stroke="var(--color-sales)" strokeWidth={3} dot={false} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
