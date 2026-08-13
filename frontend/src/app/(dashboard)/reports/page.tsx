"use client"

import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, LineChart, Line } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const salesData = [
  { month: "Jan", sales: 12000000, profit: 4500000 },
  { month: "Feb", sales: 15000000, profit: 5800000 },
  { month: "Mar", sales: 18000000, profit: 7200000 },
  { month: "Apr", sales: 14000000, profit: 5100000 },
  { month: "May", sales: 22000000, profit: 9000000 },
  { month: "Jun", sales: 25000000, profit: 10500000 },
]

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
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">
          Analytics and insights for your business.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 106M</div>
            <p className="text-xs text-muted-foreground">
              +24% from last year
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Transaction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp 45.500</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Selling Item</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Kopi Susu Aren</div>
            <p className="text-xs text-muted-foreground">
              420 units sold
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Busiest Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12:00 - 13:00</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sales vs Profit (6 Months)</CardTitle>
            <CardDescription>
              Comparing total revenue and net profit.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesConfig} className="min-h-[300px] w-full">
              <BarChart data={salesData}>
                <CartesianGrid vertical={false} />
                <XAxis 
                  dataKey="month" 
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
              Monthly revenue trajectory.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesConfig} className="min-h-[300px] w-full">
              <LineChart data={salesData}>
                <CartesianGrid vertical={false} />
                <XAxis 
                  dataKey="month" 
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
    </div>
  )
}
