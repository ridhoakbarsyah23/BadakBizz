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
import { Loader2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const salesConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--destructive))",
  }
}

export default function ReportsPage() {
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateRange, setDateRange] = useState('this_year')
  const { token } = useAuth()

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

        let url = 'http://localhost:8000/api/reports'
        if (startDate) {
          url += `?start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
        }

        const res = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })
        
        if (!res.ok) throw new Error('Failed to fetch reports data')
        
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
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Analytics and insights for your business.
          </p>
        </div>
        <div className="w-[180px]">
          <Select value={dateRange} onValueChange={(val) => { if (val) setDateRange(val) }}>
            <SelectTrigger>
              <SelectValue placeholder="Select period">
                {dateRange === 'today' && 'Today'}
                {dateRange === 'last_7_days' && 'Last 7 Days'}
                {dateRange === 'last_30_days' && 'Last 30 Days'}
                {dateRange === 'this_month' && 'This Month'}
                {dateRange === 'this_year' && 'This Year'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
            </SelectContent>
          </Select>
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
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {Number(data?.totalRevenue || 0).toLocaleString("id-ID")}
                </div>
                <p className="text-xs text-muted-foreground">
                  For the selected period
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  Rp {Number(data?.averageTransaction || 0).toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Selling Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold truncate">
                  {data?.topSellingItem?.name || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data?.topSellingItem ? `${data.topSellingItem.sold} units sold` : "No sales yet"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Busiest Hour</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.busiestHour || "N/A"}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Sales vs Profit</CardTitle>
                <CardDescription>
                  Comparing total revenue and net profit.
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
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  Revenue trajectory over the selected period.
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
