"use client"

import { apiUrl } from "@/lib/api"
import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, CalendarClock, Users, Wallet, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Shift {
  id: number
  user_id: number
  start_time: string
  end_time: string | null
  starting_cash: string
  ending_cash: string | null
  status: string
  cash_sales: number
  total_sales: number
  transaction_count: number
  expected_cash: number
  discrepancy: number | null
  duration_minutes: number
  user: {
    name: string
  }
}

export default function ShiftsPage() {
  const { token } = useAuth()
  const [shifts, setShifts] = useState<Shift[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchShifts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/shifts'), {
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch data')
      const data = await res.json()
      setShifts(data)
    } catch (error) {
      console.error('Error fetching shifts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchShifts()
    }
  }, [token])

  const filteredShifts = shifts.filter(shift => 
    shift.user?.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  const activeShifts = shifts.filter(shift => shift.status === 'open')
  const closedShifts = shifts.filter(shift => shift.status === 'closed')
  const activeCashTotal = activeShifts.reduce((sum, shift) => sum + Number(shift.expected_cash || 0), 0)
  const totalDiscrepancy = closedShifts.reduce((sum, shift) => sum + Number(shift.discrepancy || 0), 0)

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-"
    const date = new Date(dateString)
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number | string | null) => {
    if (amount === null || amount === undefined) return "-"
    return `Rp ${Number(amount).toLocaleString('id-ID')}`
  }

  const formatDuration = (minutes: number) => {
    const safeMinutes = Math.max(0, Number(minutes || 0))
    const hours = Math.floor(safeMinutes / 60)
    const restMinutes = safeMinutes % 60

    if (hours === 0) return `${restMinutes} menit`
    if (restMinutes === 0) return `${hours} jam`
    return `${hours} jam ${restMinutes} menit`
  }

  const discrepancyLabel = (amount: number | null) => {
    const value = Number(amount || 0)
    if (value === 0) return "PAS"
    if (value > 0) return `LEBIH ${formatCurrency(value)}`
    return `KURANG ${formatCurrency(Math.abs(value))}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Laporan Shift Kasir</h1>
        <p className="text-muted-foreground">
          Pantau riwayat buka/tutup kasir dan selisih uang harian.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Shift Aktif</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{activeShifts.length}</p>
            </div>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Estimasi Kas Aktif</p>
              <p className="mt-1 text-xl font-black text-slate-900">{formatCurrency(activeCashTotal)}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Shift Selesai</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{closedShifts.length}</p>
            </div>
            <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">Total Selisih</p>
              <p className={`mt-1 text-xl font-black ${totalDiscrepancy === 0 ? 'text-slate-900' : totalDiscrepancy > 0 ? 'text-amber-700' : 'text-red-700'}`}>
                {formatCurrency(totalDiscrepancy)}
              </p>
            </div>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {activeShifts.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {activeShifts.map((shift) => (
            <Card key={shift.id} className="border-blue-100 bg-blue-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-blue-950">{shift.user?.name}</p>
                    <p className="mt-1 text-xs font-semibold text-blue-700">
                      Aktif {formatDuration(shift.duration_minutes)} sejak {formatDate(shift.start_time)}
                    </p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Aktif</Badge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-white/75 p-2">
                    <p className="font-semibold text-slate-500">Transaksi</p>
                    <p className="mt-1 font-black text-slate-900">{shift.transaction_count}</p>
                  </div>
                  <div className="rounded-lg bg-white/75 p-2">
                    <p className="font-semibold text-slate-500">Cash</p>
                    <p className="mt-1 font-black text-slate-900">{formatCurrency(shift.cash_sales)}</p>
                  </div>
                  <div className="rounded-lg bg-white/75 p-2">
                    <p className="font-semibold text-slate-500">Laci</p>
                    <p className="mt-1 font-black text-slate-900">{formatCurrency(shift.expected_cash)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama kasir..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="py-4 px-6 border-b bg-slate-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Riwayat Shift
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table className="w-full min-w-[900px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="py-4">KASIR</TableHead>
                    <TableHead>WAKTU SHIFT</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead>MODAL AWAL</TableHead>
                    <TableHead>PENJUALAN CASH</TableHead>
                    <TableHead>TOTAL SALES</TableHead>
                    <TableHead>TRANSAKSI</TableHead>
                    <TableHead>DURASI</TableHead>
                    <TableHead>ESTIMASI UANG LACI</TableHead>
                    <TableHead>UANG AKTUAL</TableHead>
                    <TableHead className="text-right">SELISIH (DISCREPANCY)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                        Belum ada riwayat shift.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredShifts.map((shift) => (
                      <TableRow key={shift.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium">
                          {shift.user?.name}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span className="text-green-600 font-medium">Buka: {formatDate(shift.start_time)}</span>
                            <span className="text-red-600 font-medium">Tutup: {formatDate(shift.end_time)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {shift.status === 'open' ? (
                            <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Sedang Aktif</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-slate-200">Selesai</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatCurrency(shift.starting_cash)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(shift.cash_sales)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(shift.total_sales)}</TableCell>
                        <TableCell>{shift.transaction_count}</TableCell>
                        <TableCell>{formatDuration(shift.duration_minutes)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(shift.expected_cash)}</TableCell>
                        <TableCell className="font-bold">{formatCurrency(shift.ending_cash)}</TableCell>
                        <TableCell className="text-right">
                          {shift.status === 'open' ? (
                            <span className="text-muted-foreground italic text-sm">Belum tutup kasir</span>
                          ) : (
                            <Badge 
                              variant={shift.discrepancy === 0 ? "secondary" : "destructive"} 
                              className={`
                                text-sm px-2 py-1 
                                ${shift.discrepancy === 0 ? 'bg-green-100 text-green-700 border-green-200' : ''}
                                ${shift.discrepancy && shift.discrepancy > 0 ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : ''}
                              `}
                            >
                              {discrepancyLabel(shift.discrepancy)}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
