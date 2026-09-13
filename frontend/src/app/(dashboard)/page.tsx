"use client"

import { apiUrl } from "@/lib/api"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  ArrowUpRight,
  BarChart3,
  CreditCard,
  DollarSign,
  Loader2,
  PackageSearch,
  RefreshCw,
  ShoppingBag,
  TriangleAlert,
  Users,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type FilterValue = "today" | "week" | "month"

type SalesTrendItem = { date: string; revenue: number }
type TopProduct = { name: string; total_sold: number }
type InventoryProduct = {
  id: number
  name: string
  sku: string
  current_stock: number | string | null
}
type DashboardData = {
  revenueToday?: number | string
  transactionsToday?: number
  totalCustomers?: number
  salesTrend?: SalesTrendItem[]
  topProducts?: TopProduct[]
  outOfStockProducts?: InventoryProduct[]
  lowStockProducts?: InventoryProduct[]
}

const filters: Array<{ value: FilterValue; label: string; shortLabel: string }> = [
  { value: "today", label: "Hari Ini", shortLabel: "Hari" },
  { value: "week", label: "7 Hari", shortLabel: "7 Hari" },
  { value: "month", label: "30 Hari", shortLabel: "30 Hari" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: "easeOut" as const } },
}

export default function Dashboard() {
  const { token } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState<FilterValue>("today")
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) return
      setIsLoading(true)
      setError("")

      try {
        const res = await fetch(apiUrl(`/api/dashboard?filter=${filter}`), {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) throw new Error("Ringkasan bisnis belum dapat dimuat.")
        setData(await res.json())
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Terjadi kesalahan saat memuat dasbor.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchDashboard()
  }, [token, filter, refreshKey])

  if (isLoading && !data) return <DashboardSkeleton />

  const selectedPeriod = filters.find((item) => item.value === filter)?.label || "Periode"
  const salesTrend = data?.salesTrend || []
  const topProducts = data?.topProducts || []
  const outOfStockProducts = data?.outOfStockProducts || []
  const lowStockProducts = data?.lowStockProducts || []

  return (
    <motion.div
      className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.section
        variants={itemVariants}
        className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-900 px-5 py-5 text-white shadow-xl shadow-blue-950/10 sm:px-7 sm:py-6 lg:px-8"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-6 -top-10 h-36 w-36 rounded-full bg-cyan-300/10 blur-2xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-blue-50 backdrop-blur-sm">
              <BarChart3 className="h-3.5 w-3.5 text-cyan-200" />
              Ringkasan operasional
            </div>
            <h1 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl lg:text-4xl">Analitik Bisnis</h1>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-blue-100/80 sm:text-base">
              Pantau kinerja penjualan, pelanggan, dan kondisi stok dari satu tampilan.
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-1 rounded-2xl border border-white/15 bg-slate-950/20 p-1.5 backdrop-blur-sm sm:w-auto sm:min-w-[300px]">
            {filters.map((item) => (
              <button
                key={item.value}
                type="button"
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
                className={`rounded-xl px-3 py-2 text-xs font-extrabold transition-all sm:text-sm ${
                  filter === item.value
                    ? "bg-white text-blue-700 shadow-lg shadow-slate-950/10"
                    : "text-blue-100 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {error && (
        <motion.div
          variants={itemVariants}
          role="alert"
          className="flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2.5">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
          <Button variant="outline" size="sm" className="border-red-200 bg-white text-red-700" onClick={() => setRefreshKey((value) => value + 1)}>
            <RefreshCw className="h-3.5 w-3.5" /> Coba lagi
          </Button>
        </motion.div>
      )}

      {isLoading && data && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-xl">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Memperbarui data
        </div>
      )}

      <section className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">
        <MetricCard label="Total Pendapatan" value={`Rp ${Number(data?.revenueToday || 0).toLocaleString("id-ID")}`} note={`Pendapatan ${selectedPeriod.toLowerCase()}`} icon={DollarSign} tone="blue" />
        <MetricCard label="Total Transaksi" value={Number(data?.transactionsToday || 0).toLocaleString("id-ID")} note={`Transaksi ${selectedPeriod.toLowerCase()}`} icon={CreditCard} tone="emerald" />
        <MetricCard label="Total Pelanggan" value={Number(data?.totalCustomers || 0).toLocaleString("id-ID")} note="Pelanggan terdaftar" icon={Users} tone="violet" />
        <MetricCard label="Stok Habis" value={outOfStockProducts.length.toLocaleString("id-ID")} note={outOfStockProducts.length > 0 ? "Perlu ditangani segera" : "Persediaan dalam kondisi aman"} icon={TriangleAlert} tone={outOfStockProducts.length > 0 ? "red" : "slate"} />
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-5">
        <motion.div variants={itemVariants} className="min-w-0 xl:col-span-3">
          <Card className="h-full min-w-0 gap-0 overflow-hidden rounded-[1.5rem] border-slate-200/70 bg-white py-0 shadow-sm shadow-slate-950/5">
            <CardHeader className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div>
                <CardTitle className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Tren Penjualan</CardTitle>
                <CardDescription className="mt-1 text-sm">Pergerakan pendapatan untuk periode {selectedPeriod.toLowerCase()}.</CardDescription>
              </div>
              <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-extrabold text-blue-700">{selectedPeriod}</span>
            </CardHeader>
            <CardContent className="min-w-0 p-3 sm:p-5">
              {salesTrend.length === 0 ? (
                <EmptyState icon={BarChart3} title="Belum ada data penjualan" description="Grafik akan muncul setelah transaksi berhasil tercatat pada periode ini." />
              ) : (
                <div className="h-[250px] min-w-0 w-full sm:h-[310px]">
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                    minWidth={0}
                    minHeight={250}
                    initialDimension={{ width: 800, height: 310 }}
                  >
                    <BarChart data={salesTrend} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="4 6" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={10} fontSize={11} stroke="#64748b" />
                      <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `Rp ${Number(value) / 1000}k`} fontSize={11} stroke="#64748b" width={72} />
                      <Tooltip
                        formatter={(value) => [`Rp ${Number(value || 0).toLocaleString("id-ID")}`, "Pendapatan"]}
                        cursor={{ fill: "rgba(37, 99, 235, 0.06)" }}
                        contentStyle={{ borderRadius: "14px", border: "1px solid #e2e8f0", boxShadow: "0 12px 30px -12px rgb(15 23 42 / 0.25)" }}
                      />
                      <Bar dataKey="revenue" fill="#2563eb" radius={[7, 7, 2, 2]} maxBarSize={52} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="min-w-0 xl:col-span-2">
          <Card className="h-full min-w-0 gap-0 overflow-hidden rounded-[1.5rem] border-slate-200/70 bg-white py-0 shadow-sm shadow-slate-950/5">
            <CardHeader className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg font-black tracking-tight text-slate-900 sm:text-xl">Produk Terlaris</CardTitle>
                  <CardDescription className="mt-1 text-sm">Produk dengan penjualan terbanyak.</CardDescription>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><ShoppingBag className="h-5 w-5" /></div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-5">
              {topProducts.length === 0 ? (
                <EmptyState icon={PackageSearch} title="Belum ada produk terjual" description="Daftar produk terlaris akan diperbarui otomatis setelah ada transaksi." compact />
              ) : (
                <div className="space-y-2">
                  <AnimatePresence mode="popLayout">
                    {topProducts.slice(0, 5).map((item, index) => (
                      <motion.div key={item.name} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ delay: index * 0.05 }} className="group flex min-w-0 items-center gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-slate-100 hover:bg-slate-50">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${rankTone(index)}`}>{index + 1}</div>
                        <p className="min-w-0 flex-1 truncate text-sm font-bold text-slate-800">{item.name}</p>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black text-slate-900">{Number(item.total_sold).toLocaleString("id-ID")}</p>
                          <p className="text-[10px] font-semibold text-slate-400">terjual</p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <InventoryCard title="Stok Habis" description="Produk yang perlu segera diisi ulang." products={outOfStockProducts} tone="danger" />
        <InventoryCard title="Stok Menipis" description="Produk yang mendekati batas minimum." products={lowStockProducts} tone="warning" />
      </section>
    </motion.div>
  )
}

function MetricCard({ label, value, note, icon: Icon, tone }: { label: string; value: string; note: string; icon: typeof DollarSign; tone: "blue" | "emerald" | "violet" | "red" | "slate" }) {
  const tones = {
    blue: { icon: "bg-blue-50 text-blue-600", accent: "bg-blue-500" },
    emerald: { icon: "bg-emerald-50 text-emerald-600", accent: "bg-emerald-500" },
    violet: { icon: "bg-violet-50 text-violet-600", accent: "bg-violet-500" },
    red: { icon: "bg-red-50 text-red-600", accent: "bg-red-500" },
    slate: { icon: "bg-slate-100 text-slate-500", accent: "bg-slate-400" },
  }[tone]

  return (
    <motion.div variants={itemVariants}>
      <Card className="group relative h-full gap-0 overflow-hidden rounded-[1.35rem] border-slate-200/70 bg-white py-0 shadow-sm shadow-slate-950/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-950/5">
        <div className={`absolute inset-x-0 top-0 h-1 ${tones.accent}`} />
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-extrabold uppercase tracking-[0.08em] text-slate-500">{label}</p>
              <p className="mt-3 truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{value}</p>
            </div>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105 ${tones.icon}`}><Icon className="h-5 w-5" /></div>
          </div>
          <p className="mt-2 truncate text-xs font-medium text-slate-400">{note}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function InventoryCard({ title, description, products, tone }: { title: string; description: string; products: InventoryProduct[]; tone: "danger" | "warning" }) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="h-full gap-0 overflow-hidden rounded-[1.5rem] border-slate-200/70 bg-white py-0 shadow-sm shadow-slate-950/5">
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div><CardTitle className="text-lg font-black tracking-tight text-slate-900">{title}</CardTitle><CardDescription className="mt-1 text-sm">{description}</CardDescription></div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{products.length}</span>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <InventoryAlertList products={products} tone={tone} />
          <Link href="/inventory" className="mt-4 inline-flex items-center gap-1.5 text-xs font-extrabold text-blue-700 transition-colors hover:text-blue-900">Buka manajemen stok <ArrowUpRight className="h-3.5 w-3.5" /></Link>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function InventoryAlertList({ products, tone }: { products: InventoryProduct[]; tone: "danger" | "warning" }) {
  if (!products.length) return <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm font-medium text-slate-500">Tidak ada produk yang perlu ditangani.</div>

  return (
    <div className="space-y-2">
      {products.slice(0, 5).map((product) => (
        <div key={product.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5 transition-colors hover:bg-slate-50">
          <div className="min-w-0"><p className="truncate text-sm font-bold text-slate-800">{product.name}</p><p className="truncate text-xs font-medium text-slate-400">{product.sku}</p></div>
          <div className={`shrink-0 rounded-lg px-2.5 py-1 text-sm font-black ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{Number(product.current_stock || 0).toLocaleString("id-ID")}</div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon: Icon, title, description, compact = false }: { icon: typeof BarChart3; title: string; description: string; compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-5 text-center ${compact ? "min-h-48 py-8" : "min-h-[250px] py-10 sm:min-h-[310px]"}`}>
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm"><Icon className="h-5 w-5" /></div>
      <p className="text-sm font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-xs text-xs font-medium leading-5 text-slate-500">{description}</p>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 sm:space-y-6">
      <Skeleton className="h-44 w-full rounded-[1.75rem] sm:h-40" />
      <div className="grid grid-cols-1 gap-3 min-[440px]:grid-cols-2 xl:grid-cols-4 sm:gap-4">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-[1.35rem]" />)}</div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5"><Skeleton className="h-[390px] rounded-[1.5rem] xl:col-span-3" /><Skeleton className="h-[390px] rounded-[1.5rem] xl:col-span-2" /></div>
    </div>
  )
}

function rankTone(index: number) {
  if (index === 0) return "bg-amber-100 text-amber-700"
  if (index === 1) return "bg-slate-200 text-slate-700"
  if (index === 2) return "bg-orange-100 text-orange-700"
  return "bg-blue-50 text-blue-700"
}
