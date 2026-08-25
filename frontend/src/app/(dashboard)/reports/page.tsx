"use client"

import { useState, useEffect } from "react"
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useAuth } from "@/context/AuthContext"
import { Loader2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const salesConfig = {
  sales: {
    label: "Penjualan",
    color: "hsl(var(--primary))",
  },
  profit: {
    label: "Laba",
    color: "hsl(var(--destructive))",
  }
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState('this_year')
  const [isExporting, setIsExporting] = useState(false)
  const { token } = useAuth()

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const now = new Date()
      let startDate = ''
      let endDate = now.toISOString()
      
      if (dateRange === 'today') {
        const start = new Date(now)
        start.setHours(0, 0, 0, 0)
        startDate = start.toISOString()
      } else if (dateRange === 'last_7_days') {
        const start = new Date(now)
        start.setDate(now.getDate() - 6)
        start.setHours(0, 0, 0, 0)
        startDate = start.toISOString()
      } else if (dateRange === 'last_30_days') {
        const start = new Date(now)
        start.setDate(now.getDate() - 29)
        start.setHours(0, 0, 0, 0)
        startDate = start.toISOString()
      } else if (dateRange === 'this_month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        startDate = start.toISOString()
      } else if (dateRange === 'this_year') {
        const start = new Date(now.getFullYear(), 0, 1)
        startDate = start.toISOString()
      }

      let url = 'http://127.0.0.1:8000/api/reports/export'
      if (startDate) {
        url += `?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!res.ok) throw new Error('Gagal mengekspor data')
      
      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `BadakBizPOS_Report_${dateRange}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      a.remove()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true)
        
        const now = new Date()
        let startDate = ''
        let endDate = now.toISOString()
        
        if (dateRange === 'today') {
          const start = new Date(now)
          start.setHours(0, 0, 0, 0)
          startDate = start.toISOString()
        } else if (dateRange === 'last_7_days') {
          const start = new Date(now)
          start.setDate(now.getDate() - 6)
          start.setHours(0, 0, 0, 0)
          startDate = start.toISOString()
        } else if (dateRange === 'last_30_days') {
          const start = new Date(now)
          start.setDate(now.getDate() - 29)
          start.setHours(0, 0, 0, 0)
          startDate = start.toISOString()
        } else if (dateRange === 'this_month') {
          const start = new Date(now.getFullYear(), now.getMonth(), 1)
          startDate = start.toISOString()
        } else if (dateRange === 'this_year') {
          const start = new Date(now.getFullYear(), 0, 1)
          startDate = start.toISOString()
        }

        let url = 'http://127.0.0.1:8000/api/reports'
        if (startDate) {
          url += `?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
        }

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })
        
        if (!res.ok) throw new Error('Gagal mengambil data laporan')
        
        const jsonData = await res.json()
        setData(jsonData)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setIsLoading(false)
      }
    }

    if (token) fetchReports()
  }, [token, dateRange])

  if (error) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-red-500 font-semibold">
        {error}
      </div>
    )
  }

  const chartData = data?.chartData || []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Laporan Keuangan</h1>
          <p className="text-muted-foreground">
            Analitik dan wawasan untuk bisnis Anda.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} variant="outline" className="h-10" disabled={isExporting}>
            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Ekspor CSV
          </Button>
          <div className="w-[180px]">
            <Select value={dateRange} onValueChange={(val) => { if (val) setDateRange(val) }}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih periode">
                  {dateRange === 'today' && 'Hari Ini'}
                  {dateRange === 'last_7_days' && '7 Hari Terakhir'}
                  {dateRange === 'last_30_days' && '30 Hari Terakhir'}
                  {dateRange === 'this_month' && 'Bulan Ini'}
                  {dateRange === 'this_year' && 'Tahun Ini'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hari Ini</SelectItem>
                <SelectItem value="last_7_days">7 Hari Terakhir</SelectItem>
                <SelectItem value="last_30_days">30 Hari Terakhir</SelectItem>
                <SelectItem value="this_month">Bulan Ini</SelectItem>
                <SelectItem value="this_year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex h-[40vh] items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
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
                <div className="text-2xl font-bold truncate">
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

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Penjualan vs Laba</CardTitle>
                <CardDescription>
                  Perbandingan total pendapatan dan laba bersih.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={salesConfig} className="min-h-[300px] w-full">
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
                <ChartContainer config={salesConfig} className="min-h-[300px] w-full">
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
