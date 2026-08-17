"use client"

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
import { Loader2, Search, CalendarClock } from "lucide-react"
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
  expected_cash: number
  discrepancy: number | null
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
      const res = await fetch('http://localhost:8000/api/shifts', {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Laporan Shift Kasir</h1>
        <p className="text-muted-foreground">
          Pantau riwayat buka/tutup kasir dan selisih uang harian.
        </p>
      </div>

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
                    <TableHead>ESTIMASI UANG LACI</TableHead>
                    <TableHead>UANG AKTUAL</TableHead>
                    <TableHead className="text-right">SELISIH (DISCREPANCY)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredShifts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                              {shift.discrepancy === 0 && "PAS"}
                              {shift.discrepancy && shift.discrepancy > 0 && `LEBIH ${formatCurrency(shift.discrepancy)}`}
                              {shift.discrepancy && shift.discrepancy < 0 && `KURANG ${formatCurrency(Math.abs(shift.discrepancy))}`}
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
