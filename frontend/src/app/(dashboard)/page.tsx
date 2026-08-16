"use client"

import { Card } from "@heroui/react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const chartData = [
  { day: "Mon", sales: 1200000 },
  { day: "Tue", sales: 1500000 },
  { day: "Wed", sales: 900000 },
  { day: "Thu", sales: 2100000 },
  { day: "Fri", sales: 2800000 },
  { day: "Sat", sales: 3500000 },
  { day: "Sun", sales: 3200000 },
]

const chartConfig = {
  sales: {
    label: "Sales",
    color: "hsl(var(--primary))",
  },
}

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-default-900">Dashboard</h1>
        <p className="text-default-500">
          Welcome to Kivo POS. Here is your business overview.
        </p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-none shadow-sm">
          <Card.Header className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <h3 className="text-sm font-medium text-default-700">Total Sales (Today)</h3>
          </Card.Header>
          <Card.Content className="px-4 pb-4">
            <div className="text-2xl font-bold text-default-900">Rp 3.200.000</div>
            <p className="text-xs text-default-500 mt-1">
              +12% from yesterday
            </p>
          </Card.Content>
        </Card>
        
        <Card className="border-none shadow-sm">
          <Card.Header className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <h3 className="text-sm font-medium text-default-700">Transactions</h3>
          </Card.Header>
          <Card.Content className="px-4 pb-4">
            <div className="text-2xl font-bold text-default-900">48</div>
            <p className="text-xs text-default-500 mt-1">
              +4 from yesterday
            </p>
          </Card.Content>
        </Card>
        
        <Card className="border-none shadow-sm">
          <Card.Header className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <h3 className="text-sm font-medium text-default-700">Products Sold</h3>
          </Card.Header>
          <Card.Content className="px-4 pb-4">
            <div className="text-2xl font-bold text-default-900">124</div>
            <p className="text-xs text-default-500 mt-1">
              +18% from yesterday
            </p>
          </Card.Content>
        </Card>
        
        <Card className="border-none shadow-sm">
          <Card.Header className="flex flex-row items-center justify-between pb-2 px-4 pt-4">
            <h3 className="text-sm font-medium text-default-700">Low Stock Items</h3>
          </Card.Header>
          <Card.Content className="px-4 pb-4">
            <div className="text-2xl font-bold text-danger">3</div>
            <p className="text-xs text-default-500 mt-1">
              Needs your attention
            </p>
          </Card.Content>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-7 lg:grid-cols-7">
        <Card className="col-span-4 border-none shadow-sm">
          <Card.Header className="px-6 pt-6 pb-2">
            <h3 className="font-semibold text-lg text-default-900">Sales Overview (This Week)</h3>
            <p className="text-sm text-default-500">
              Your store revenue in the last 7 days.
            </p>
          </Card.Header>
          <Card.Content className="px-6 pb-6">
            <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} stroke="hsl(var(--nextui-default-200))" />
                <XAxis 
                  dataKey="day" 
                  tickLine={false} 
                  axisLine={false}
                  tickMargin={10} 
                  stroke="hsl(var(--nextui-default-500))"
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="sales" fill="var(--color-sales)" radius={4} />
              </BarChart>
            </ChartContainer>
          </Card.Content>
        </Card>
        
        <Card className="col-span-3 border-none shadow-sm">
          <Card.Header className="px-6 pt-6 pb-2">
            <h3 className="font-semibold text-lg text-default-900">Recent Transactions</h3>
            <p className="text-sm text-default-500">
              You made 48 sales today.
            </p>
          </Card.Header>
          <Card.Content className="px-6 pb-6">
            <div className="space-y-4">
              {[
                { time: "10:24", amount: 45000, items: 2 },
                { time: "10:15", amount: 120000, items: 5 },
                { time: "09:48", amount: 18000, items: 1 },
                { time: "09:30", amount: 35000, items: 2 },
              ].map((tx, i) => (
                <div key={i} className="flex items-center justify-between border-b border-default-200 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium leading-none text-default-900">Order #{1000 - i}</p>
                    <p className="text-sm text-default-500 mt-1">{tx.items} items</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-default-900">Rp {tx.amount.toLocaleString("id-ID")}</p>
                    <p className="text-xs text-default-500 mt-1">{tx.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      </div>
    </div>
  )
}
