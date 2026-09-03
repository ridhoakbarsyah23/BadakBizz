"use client"

import { apiUrl } from "@/lib/api"
import { useState, useEffect } from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, DollarSign, CreditCard, Users, AlertOctagon } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export default function Dashboard() {
  const { token } = useAuth()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState("today") // today, week, month

  useEffect(() => {
    const fetchDashboard = async () => {
      if (!token) return
      setIsLoading(true)
      try {
        const res = await fetch(apiUrl(`/api/dashboard?filter=${filter}`), {
          headers: { "Authorization": `Bearer ${token}` }
        })
        const result = await res.json()
        setData(result)
      } catch {
        setData(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboard()
  }, [token, filter])

  // Function to render skeletons
  const renderSkeletons = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-5 w-[250px]" />
        </div>
        <Skeleton className="h-10 w-[240px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-[120px]" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
        <Card className="col-span-4 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[150px]" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>

        <Card className="col-span-3 shadow-sm">
          <CardHeader>
            <Skeleton className="h-6 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[150px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
                <Skeleton className="h-4 w-[50px]" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )

  if (isLoading && !data) {
    return renderSkeletons()
  }

  // Animation variants
  const containerVariants: any = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  }

  const itemVariants: any = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <motion.div variants={itemVariants} className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analitik Dasbor</h1>
          <p className="text-muted-foreground">
            Selamat datang di BadakBizz. Berikut adalah ringkasan bisnis Anda.
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <Button
            variant={filter === 'today' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-lg px-4 transition-all duration-300 ${filter === 'today' ? 'shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setFilter('today')}
          >
            Hari Ini
          </Button>
          <Button
            variant={filter === 'week' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-lg px-4 transition-all duration-300 ${filter === 'week' ? 'shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setFilter('week')}
          >
            7 Hari
          </Button>
          <Button
            variant={filter === 'month' ? 'default' : 'ghost'}
            size="sm"
            className={`rounded-lg px-4 transition-all duration-300 ${filter === 'month' ? 'shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
            onClick={() => setFilter('month')}
          >
            30 Hari
          </Button>
        </motion.div>
      </div>

      {isLoading && data && (
        <div className="fixed bottom-4 right-4 z-50 bg-white p-3 rounded-full shadow-lg border border-slate-100">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pendapatan
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center transition-transform hover:scale-110">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-800">
                Rp {Number(data?.revenueToday || 0).toLocaleString("id-ID")}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Transaksi
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center transition-transform hover:scale-110">
                <CreditCard className="h-5 w-5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-800">
                {data?.transactionsToday || 0}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Pelanggan
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center transition-transform hover:scale-110">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-slate-800">
                {data?.totalCustomers || 0}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Stok Habis
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center transition-transform hover:scale-110">
                <AlertOctagon className="h-5 w-5 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-black text-red-600">
                {data?.outOfStockProducts?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Perlu restock segera
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-7">
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-4">
          <Card className="shadow-sm h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Ringkasan Penjualan</CardTitle>
              <CardDescription>
                Tren pendapatan toko Anda untuk periode yang dipilih.
              </CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.salesTrend || []}>
                    <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      fontSize={12}
                      stroke="#64748b"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `Rp ${(value / 1000)}k`}
                      fontSize={12}
                      stroke="#64748b"
                      width={80}
                    />
                    <Tooltip
                      formatter={(value: any) => [`Rp ${Number(value).toLocaleString("id-ID")}`, "Pendapatan"]}
                      cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants} className="col-span-1 md:col-span-3">
          <Card className="shadow-sm h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Produk Terlaris</CardTitle>
              <CardDescription>
                Item paling populer berdasarkan jumlah terjual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6 mt-2">
                {!data?.topProducts || data.topProducts.length === 0 ? (
                  <div className="text-center text-muted-foreground py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    Tidak ada data penjualan untuk periode ini.
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {data.topProducts.map((item: any, i: number) => (
                      <motion.div
                        key={item.name}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-center justify-between group p-2 hover:bg-slate-50 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm transition-transform group-hover:scale-110 ${i === 0 ? 'bg-amber-100 text-amber-600' :
                              i === 1 ? 'bg-slate-200 text-slate-600' :
                                i === 2 ? 'bg-orange-100 text-orange-600' :
                                  'bg-primary/10 text-primary'
                            }`}>
                            #{i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">{item.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-800">{item.total_sold} <span className="text-slate-500 font-medium text-xs">terjual</span></p>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Stok Habis</CardTitle>
              <CardDescription>Produk yang perlu segera diisi ulang.</CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryAlertList products={data?.outOfStockProducts || []} tone="danger" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="shadow-sm h-full rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Stok Menipis</CardTitle>
              <CardDescription>Produk yang sudah mendekati batas minimum.</CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryAlertList products={data?.lowStockProducts || []} tone="warning" />
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
}

function InventoryAlertList({ products, tone }: { products: any[]; tone: "danger" | "warning" }) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Tidak ada produk.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {products.slice(0, 5).map((product: any) => (
        <div key={product.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{product.name}</p>
            <p className="truncate text-xs text-slate-500">{product.sku}</p>
          </div>
          <div className={`text-sm font-bold ${tone === "danger" ? "text-red-600" : "text-amber-600"}`}>
            {Number(product.current_stock || 0).toLocaleString("id-ID")}
          </div>
        </div>
      ))}
    </div>
  )
}
