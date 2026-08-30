"use client"

import { apiUrl } from "@/lib/api"
import React, { useState, useEffect, type CSSProperties } from "react"
import { QRCodeSVG } from "qrcode.react"
import { useAuth } from "@/context/AuthContext"
import {
  Button,
  Input,
  Chip
} from "@heroui/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { AlertTriangle, CalendarDays, Download, Eye, Loader2, Printer, QrCode, Receipt, RefreshCw, RotateCcw, Search, XCircle } from "lucide-react"

interface TransactionItem {
  id: number
  product_id: number
  quantity: number
  price: string
  subtotal: string
  product: {
    id: number
    name: string
    sku: string
  }
  variant?: {
    id: number
    name: string
    sku: string | null
  } | null
}

interface Transaction {
  id: number
  transaction_number: string
  customer_id: number | null
  cashier_id: number | null
  subtotal: string
  tax: string
  service_charge: string
  discount: string
  total_amount: string
  payment_amount: string
  payment_method: string
  qris_string?: string | null
  midtrans_transaction_id?: string | null
  status: string
  order_type?: string
  created_at: string
  customer?: {
    id: number
    name: string
  }
  cashier?: {
    id: number
    name: string
  } | null
  table?: {
    id: number
    name: string
    status: string
  } | null
  items: TransactionItem[]
}

const statusLabel: Record<string, string> = {
  ALL: "Semua Status",
  PENDING: "Pending",
  COMPLETED: "Selesai",
  CANCELLED: "Batal",
}

const datePresetOptions = [
  { value: "ALL", label: "Semua Tanggal" },
  { value: "TODAY", label: "Hari Ini" },
  { value: "YESTERDAY", label: "Kemarin" },
  { value: "LAST_7_DAYS", label: "7 Hari Terakhir" },
  { value: "THIS_MONTH", label: "Bulan Ini" },
  { value: "SINGLE", label: "Tanggal Tertentu" },
  { value: "CUSTOM", label: "Rentang Tanggal" },
]

const formatInputDate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const formatFilterDate = (dateString: string) => {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const parseInputDate = (dateString: string) => {
  return dateString ? new Date(`${dateString}T00:00:00`) : null
}

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
]

const weekdayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

function CalendarPicker({
  mode,
  startDate,
  endDate,
  onChange,
}: {
  mode: "single" | "range"
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => parseInputDate(startDate) || new Date())
  const selectedStart = parseInputDate(startDate)
  const selectedEnd = parseInputDate(endDate)
  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingDays = firstDay.getDay()
  const cells = [
    ...Array.from({ length: leadingDays }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ]

  useEffect(() => {
    const nextVisibleMonth = parseInputDate(startDate)
    if (nextVisibleMonth) {
      setVisibleMonth(nextVisibleMonth)
    }
  }, [startDate])

  const moveMonth = (delta: number) => {
    setVisibleMonth(new Date(year, month + delta, 1))
  }

  const isSameDate = (a: Date | null, b: Date | null) => {
    return Boolean(a && b && formatInputDate(a) === formatInputDate(b))
  }

  const isInRange = (date: Date) => {
    if (!selectedStart || !selectedEnd) return false

    return date > selectedStart && date < selectedEnd
  }

  const handleSelectDate = (date: Date) => {
    const value = formatInputDate(date)

    if (mode === "single") {
      onChange(value, "")
      return
    }

    if (!selectedStart || selectedEnd || date < selectedStart) {
      onChange(value, "")
      return
    }

    onChange(formatInputDate(selectedStart), value)
  }

  return (
    <div className="absolute left-0 top-full z-30 mt-2 w-[min(92vw,320px)] rounded-2xl border border-default-200 bg-white p-4 shadow-xl">
      <div className="mb-3 flex items-center justify-between">
        <Button isIconOnly size="sm" variant="ghost" onPress={() => moveMonth(-1)} aria-label="Bulan sebelumnya">
          <span aria-hidden="true">‹</span>
        </Button>
        <div className="text-sm font-bold text-default-900">
          {monthNames[month]} {year}
        </div>
        <Button isIconOnly size="sm" variant="ghost" onPress={() => moveMonth(1)} aria-label="Bulan berikutnya">
          <span aria-hidden="true">›</span>
        </Button>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-[11px] font-bold text-default-400">
        {weekdayNames.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          const isSelected = isSameDate(date, selectedStart) || isSameDate(date, selectedEnd)
          const rangeClass = date && isInRange(date) ? "bg-blue-50 text-blue-700" : ""

          return date ? (
            <button
              key={date.toISOString()}
              type="button"
              className={`h-9 rounded-lg text-sm font-semibold transition-colors hover:bg-blue-50 hover:text-blue-700 ${rangeClass} ${
                isSelected ? "bg-blue-600 text-white hover:bg-blue-600 hover:text-white" : "text-default-700"
              }`}
              onClick={() => handleSelectDate(date)}
            >
              {date.getDate()}
            </button>
          ) : (
            <span key={`empty-${index}`} className="h-9" />
          )
        })}
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const { token, hasRole } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [datePreset, setDatePreset] = useState("ALL")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [qrisTransaction, setQrisTransaction] = useState<Transaction | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isQrisOpen, setIsQrisOpen] = useState(false)
  const [isReceiptMode, setIsReceiptMode] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{
    type: "cancel-qris" | "void"
    transaction: Transaction
  } | null>(null)
  const [notice, setNotice] = useState<{
    type: "error" | "success" | "info"
    message: string
  } | null>(null)
  const [isNoticeVisible, setIsNoticeVisible] = useState(false)
  const [storeSettings, setStoreSettings] = useState<any>({
    name: "BadakBizz",
    address: "",
    phone: "",
    receipt_header: "BadakBizz",
    receipt_footer: "Thank you!"
  })

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

  const getEffectiveDateRange = () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const last7DaysStart = new Date(today)
    last7DaysStart.setDate(today.getDate() - 6)
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    if (datePreset === "TODAY") {
      const value = formatInputDate(today)
      return { start: value, end: value }
    }

    if (datePreset === "YESTERDAY") {
      const value = formatInputDate(yesterday)
      return { start: value, end: value }
    }

    if (datePreset === "LAST_7_DAYS") {
      return { start: formatInputDate(last7DaysStart), end: formatInputDate(today) }
    }

    if (datePreset === "THIS_MONTH") {
      return { start: formatInputDate(thisMonthStart), end: formatInputDate(today) }
    }

    if (datePreset === "SINGLE") {
      return startDate ? { start: startDate, end: startDate } : { start: "", end: "" }
    }

    if (datePreset === "CUSTOM") {
      return { start: startDate, end: endDate || startDate }
    }

    return { start: "", end: "" }
  }

  const buildTransactionParams = (includePagination = true) => {
    const params = new URLSearchParams()

    if (includePagination) {
      params.set("page", currentPage.toString())
      params.set("per_page", "10")
    }

    if (appliedSearchQuery) params.set("search", appliedSearchQuery)

    const effectiveRange = getEffectiveDateRange()
    if (effectiveRange.start) params.set("start_date", effectiveRange.start)
    if (effectiveRange.end) params.set("end_date", effectiveRange.end)

    return params
  }

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const params = buildTransactionParams()

      const res = await fetch(apiUrl(`/api/transactions?${params.toString()}`), {
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch data')
      const data = await res.json()

      if (data && data.data) {
        setTransactions(data.data)
        setTotalPages(data.last_page || 1)
      } else {
        setTransactions(Array.isArray(data) ? data : [])
        setTotalPages(1)
      }

      const settingsRes = await fetch(apiUrl('/api/settings'), {
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        if (settingsData && settingsData.name) {
          setStoreSettings(settingsData)
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, currentPage, appliedSearchQuery, datePreset, startDate, endDate])

  const pendingTransactions = transactions.filter(trx => trx.status === "PENDING" && trx.payment_method === "QRIS")

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const exportToCSV = async () => {
    setNotice(null)

    try {
      const params = buildTransactionParams(false)
      params.set("format", "excel")
      const res = await fetch(apiUrl(`/api/reports/export?${params.toString()}`), {
        headers: { "Authorization": `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error("Gagal mengekspor Excel")
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const contentDisposition = res.headers.get("Content-Disposition") || ""
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/)
      const filename = filenameMatch?.[1] || `transaksi_${Date.now()}.xlsx`

      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setNotice({
        type: "success",
        message: "Excel transaksi berhasil diekspor sesuai filter aktif.",
      })
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal mengekspor Excel.",
      })
    }
  }

  const applySearch = () => {
    setCurrentPage(1)
    setAppliedSearchQuery(searchQuery.trim())
  }

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value)
    setCurrentPage(1)

    if (value !== "SINGLE" && value !== "CUSTOM") {
      setStartDate("")
      setEndDate("")
      setIsDatePickerOpen(false)
    }

    if (value === "SINGLE" && !startDate) {
      setStartDate(formatInputDate(new Date()))
      setEndDate("")
      setIsDatePickerOpen(true)
    }

    if (value === "CUSTOM" && !startDate) {
      setStartDate(formatInputDate(new Date()))
      setEndDate(formatInputDate(new Date()))
      setIsDatePickerOpen(true)
    }

    if (value === "SINGLE" || value === "CUSTOM") {
      setIsDatePickerOpen(true)
    }
  }

  const resetFilters = () => {
    setSearchQuery("")
    setAppliedSearchQuery("")
    setDatePreset("ALL")
    setStartDate("")
    setEndDate("")
    setCurrentPage(1)
  }

  const effectiveDateRange = getEffectiveDateRange()
  const hasActiveFilters = Boolean(appliedSearchQuery)
    || Boolean(effectiveDateRange.start || effectiveDateRange.end)

  const updateTransactionInState = (updated: Transaction) => {
    setTransactions(prev => prev.map(trx => (
      trx.id === updated.id ? { ...trx, ...updated } : trx
    )))
    setSelectedTransaction(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
    setQrisTransaction(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev)
  }

  const handleCheckQrisStatus = async (transaction: Transaction) => {
    setIsActionLoading(true)
    setNotice(null)

    try {
      const res = await fetch(apiUrl(`/api/qris/status/${transaction.transaction_number}`), {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal mengecek status QRIS")
      }

      const updated = { ...transaction, status: data.transaction_status }
      updateTransactionInState(updated)
      setNotice({
        type: data.transaction_status === "PENDING" ? "info" : "success",
        message: `Status ${transaction.transaction_number}: ${data.transaction_status}`,
      })
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal mengecek status QRIS",
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleShowQris = (transaction: Transaction) => {
    if (!transaction.qris_string) {
      setNotice({
        type: "error",
        message: "QRIS transaksi ini belum tersimpan. Buat ulang transaksi atau cek status pembayaran.",
      })
      return
    }

    setQrisTransaction(transaction)
    setIsQrisOpen(true)
  }

  const handleCancelPendingQris = async (transaction: Transaction) => {
    setIsActionLoading(true)
    setNotice(null)

    try {
      const res = await fetch(apiUrl(`/api/transactions/${transaction.id}/cancel-pending-qris`), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal membatalkan QRIS pending")
      }

      updateTransactionInState(data.data)
      setNotice({
        type: "success",
        message: `QRIS pending ${transaction.transaction_number} berhasil dibatalkan.`,
      })
      setConfirmAction(null)
      fetchData()
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal membatalkan QRIS pending",
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleVoidTransaction = async () => {
    if (!selectedTransaction) return;

    try {
      setIsActionLoading(true)
      setNotice(null)
      const res = await fetch(apiUrl(`/api/transactions/${selectedTransaction.id}/void`), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to void transaction')
      }

      // Update local state
      setTransactions(prev => prev.map(trx =>
        trx.id === selectedTransaction.id ? { ...trx, status: 'CANCELLED' } : trx
      ))

      // Update selectedTransaction so the UI reflects the change immediately
      setSelectedTransaction(prev => prev ? { ...prev, status: 'CANCELLED' } : null)

      setNotice({
        type: "success",
        message: "Transaksi telah berhasil dibatalkan.",
      })
      setConfirmAction(null)

    } catch (error: any) {
      console.error('Void error:', error)
      setNotice({
        type: "error",
        message: error.message || "Gagal membatalkan transaksi.",
      })
    } finally {
      setIsActionLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Riwayat Transaksi</h1>
          <p className="text-muted-foreground">
            Lihat dan kelola semua transaksi penjualan.
          </p>
        </div>
      </div>

      {notice && (
        <div className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.type === "error"
            ? "border-red-200 bg-red-50 text-red-700"
            : notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-blue-200 bg-blue-50 text-blue-700"
        } transition-all duration-300 ease-out ${isNoticeVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}>
          {notice.type === "error" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <Receipt className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {pendingTransactions.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2 text-amber-700">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-amber-900">{pendingTransactions.length} QRIS menunggu pembayaran</p>
              <p className="text-sm text-amber-700">Cek status, tampilkan QR, atau batalkan dari daftar transaksi.</p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              setAppliedSearchQuery("")
              setDatePreset("ALL")
              setStartDate("")
              setEndDate("")
              setCurrentPage(1)
            }}
          >
            Lihat Semua
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-default-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_220px_auto_auto_auto] xl:items-center">
          <div className="relative min-w-0">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
            <Input
              type="search"
              placeholder="Cari nomor struk atau pelanggan..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  applySearch()
                }
              }}
            />
          </div>
          <select
            className="h-10 rounded-xl border border-default-200 bg-background px-3 text-sm font-medium shadow-sm"
            value={datePreset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
          >
            {datePresetOptions.map((preset) => (
              <option key={preset.value} value={preset.value}>{preset.label}</option>
            ))}
          </select>
          {(datePreset === "SINGLE" || datePreset === "CUSTOM") && (
            <div className="relative xl:col-span-2">
              <Button
                variant="outline"
                className="w-full justify-start sm:w-[360px]"
                onPress={() => setIsDatePickerOpen((open) => !open)}
              >
                <CalendarDays className="h-4 w-4 mr-2" inline-block="true" />
                {datePreset === "SINGLE"
                  ? (startDate ? formatFilterDate(startDate) : "Pilih tanggal")
                  : effectiveDateRange.start && effectiveDateRange.end
                    ? `${formatFilterDate(effectiveDateRange.start)} - ${formatFilterDate(effectiveDateRange.end)}`
                    : "Pilih rentang tanggal"}
              </Button>
              {isDatePickerOpen && (
                <CalendarPicker
                  mode={datePreset === "SINGLE" ? "single" : "range"}
                  startDate={startDate}
                  endDate={datePreset === "SINGLE" ? "" : endDate}
                  onChange={(start, end) => {
                    setStartDate(start)
                    setEndDate(end)
                    setCurrentPage(1)
                    if (datePreset === "SINGLE" || end) {
                      setIsDatePickerOpen(false)
                    }
                  }}
                />
              )}
            </div>
          )}
          <Button variant="outline" onPress={applySearch}>
            <Search className="h-4 w-4 mr-2" inline-block="true" />
            Cari
          </Button>
          {hasActiveFilters && (
            <Button variant="ghost" onPress={resetFilters}>
              <RotateCcw className="h-4 w-4 mr-2" inline-block="true" />
              Reset
            </Button>
          )}
          <Button variant="primary" onPress={exportToCSV}>
            <Download className="h-4 w-4 mr-2" inline-block="true" />
            Export Excel
          </Button>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 border-t border-default-100 pt-3">
            {appliedSearchQuery && (
              <Chip variant="soft" color="default">Cari: {appliedSearchQuery}</Chip>
            )}
            {effectiveDateRange.start && effectiveDateRange.end && (
              <Chip variant="soft" color="warning">
                Tanggal: {effectiveDateRange.start === effectiveDateRange.end
                  ? formatFilterDate(effectiveDateRange.start)
                  : `${formatFilterDate(effectiveDateRange.start)} - ${formatFilterDate(effectiveDateRange.end)}`}
              </Chip>
            )}
          </div>
        )}
      </div>

      <div className="bg-background rounded-xl border border-default-200 shadow-sm overflow-x-auto w-full">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>NO STRUK</TableHead>
                <TableHead>TANGGAL & WAKTU</TableHead>
                <TableHead>PELANGGAN</TableHead>
                <TableHead>PEMBAYARAN</TableHead>
                <TableHead>TOTAL</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-default-500">
                    Tidak ada transaksi yang ditemukan
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((trx) => (
                  <TableRow key={trx.id}>
                    <TableCell className="py-3 px-4 font-medium">{trx.transaction_number}</TableCell>
                    <TableCell className="py-3 px-4">{formatDate(trx.created_at)}</TableCell>
                    <TableCell className="py-3 px-4">{trx.customer?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-4">{trx.payment_method}</TableCell>
                    <TableCell className="py-3 px-4 font-medium text-primary">Rp {Number(trx.total_amount).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="py-3 px-4">
                      <Chip
                        color={trx.status === 'COMPLETED' ? 'success' : trx.status === 'CANCELLED' ? 'danger' : 'warning'}
                        variant="soft"
                        size="sm"
                      >
                        {statusLabel[trx.status] || trx.status}
                      </Chip>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          isDisabled={isActionLoading}
                          onPress={() => {
                            setSelectedTransaction(trx)
                            setIsReceiptMode(false)
                            setIsDetailsOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4 text-default-500 hover:text-primary" />
                        </Button>
                        <Button
                          isIconOnly
                          variant="ghost"
                          size="sm"
                          isDisabled={isActionLoading}
                          onPress={() => {
                            setSelectedTransaction(trx)
                            setIsReceiptMode(true)
                            setIsDetailsOpen(true)
                          }}
                        >
                          <Printer className="h-4 w-4 text-default-500 hover:text-primary" />
                        </Button>
                        {trx.status === "PENDING" && trx.payment_method === "QRIS" && (
                          <>
                            <Button
                              isIconOnly
                              variant="ghost"
                              size="sm"
                              isDisabled={isActionLoading}
                              onPress={() => handleShowQris(trx)}
                            >
                              <QrCode className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              isIconOnly
                              variant="ghost"
                              size="sm"
                              isDisabled={isActionLoading}
                              onPress={() => handleCheckQrisStatus(trx)}
                            >
                              <RefreshCw className="h-4 w-4 text-amber-600" />
                            </Button>
                            <Button
                              isIconOnly
                              variant="ghost"
                              size="sm"
                              isDisabled={isActionLoading}
                              onPress={() => handleCancelPendingQris(trx)}
                            >
                              <XCircle className="h-4 w-4 text-red-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 px-2">
          <Button
            variant="ghost"
            onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            isDisabled={currentPage === 1}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button
            variant="ghost"
            onPress={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            isDisabled={currentPage === totalPages}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          {isReceiptMode && selectedTransaction ? (
            <div className="flex flex-col items-center">
              <div
                id="printable-receipt"
                style={{ "--receipt-width": `${Number(storeSettings.receipt_width || 80)}mm` } as CSSProperties}
                className="bg-white text-black text-sm print:text-[10px] font-mono flex flex-col gap-2 rounded-xl border shadow-sm mx-auto mb-2 p-5 print:m-0"
              >
                <div className="receipt-text text-center font-bold text-lg print:text-[13px] leading-tight mb-1">
                  {storeSettings.receipt_header || storeSettings.name || 'BADAKBIZ'}
                </div>
                <div className="receipt-text text-center text-xs print:text-[9px] leading-snug font-normal text-gray-600 print:text-black mb-3 whitespace-pre-line">
                  {storeSettings.address || 'Alamat Toko'}{storeSettings.address ? '\n' : ''}
                  Telp: {storeSettings.phone || '-'}
                </div>

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2"></div>

                <div className="receipt-row text-xs print:text-[9px] mb-2 font-medium text-gray-600 print:text-black">
                  <span className="receipt-text">{formatDate(selectedTransaction.created_at)}</span>
                  <span className="receipt-value receipt-text">{selectedTransaction.transaction_number}</span>
                </div>
                <div className="receipt-text text-left text-xs print:text-[9px] mb-2 font-medium text-gray-600 print:text-black">
                  Pelanggan: {selectedTransaction.customer?.name || 'Walk-in'}
                </div>
                {selectedTransaction.table && (
                  <div className="receipt-text text-left text-xs print:text-[9px] mb-2 font-medium text-gray-600 print:text-black">
                    Meja: {selectedTransaction.table.name}
                  </div>
                )}

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 flex flex-col gap-2">
                  {selectedTransaction.items?.map((item: any, i: number) => (
                    <div key={i} className="flex flex-col">
                      <div className="receipt-row font-bold print:font-semibold print:text-black">
                        <span className="receipt-text pr-1">{item.variant ? `${item.product?.name} - ${item.variant.name}` : item.product?.name}</span>
                        <span className="receipt-value receipt-money">Rp {Number(item.subtotal).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="text-xs print:text-[9px] text-gray-500 print:text-black">
                        {item.quantity} x Rp {Number(item.price).toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="receipt-row text-xs print:text-[9px] print:text-black">
                  <span>Subtotal</span>
                  <span className="receipt-value receipt-money">Rp {Number(selectedTransaction.subtotal).toLocaleString("id-ID")}</span>
                </div>
                {Number(selectedTransaction.discount) > 0 && (
                  <div className="receipt-row text-xs print:text-[9px] print:text-black">
                    <span>Diskon</span>
                    <span className="receipt-value receipt-money">- Rp {Number(selectedTransaction.discount).toLocaleString("id-ID")}</span>
                  </div>
                )}
                {Number(selectedTransaction.service_charge) > 0 && (
                  <div className="receipt-row text-xs print:text-[9px] print:text-black">
                    <span>Biaya Layanan</span>
                    <span className="receipt-value receipt-money">Rp {Number(selectedTransaction.service_charge).toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="receipt-row text-xs print:text-[9px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Pajak</span>
                  <span className="receipt-value receipt-money">Rp {Number(selectedTransaction.tax).toLocaleString("id-ID")}</span>
                </div>

                <div className="receipt-row font-black text-lg print:text-[13px] mb-2 print:text-black">
                  <span>TOTAL</span>
                  <span className="receipt-value receipt-money">Rp {Number(selectedTransaction.total_amount).toLocaleString("id-ID")}</span>
                </div>

                <div className="receipt-row text-xs print:text-[9px] print:text-black">
                  <span>Bayar ({selectedTransaction.payment_method})</span>
                  <span className="receipt-value receipt-money">Rp {Number(selectedTransaction.payment_amount).toLocaleString("id-ID")}</span>
                </div>
                <div className="receipt-row text-xs print:text-[9px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Kembali</span>
                  <span className="receipt-value receipt-money font-bold">Rp {(Number(selectedTransaction.payment_amount) - Number(selectedTransaction.total_amount)).toLocaleString("id-ID")}</span>
                </div>

                <div className="receipt-text text-center text-xs print:text-[9px] mt-2 print:mt-1 italic text-gray-500 print:text-black whitespace-pre-line">
                  {storeSettings.receipt_footer || 'Terima kasih atas kunjungan Anda!\nSilakan datang kembali.'}
                </div>

                <div className="print:hidden border-t border-dashed mt-4 pt-4 text-center text-xs text-muted-foreground">
                  Ini adalah pratinjau struk yang akan dicetak.
                </div>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  Detail Transaksi
                </DialogTitle>
              </DialogHeader>

              {selectedTransaction && (
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border">
                    <div>
                      <p className="text-muted-foreground mb-1">No Struk</p>
                      <p className="font-bold">{selectedTransaction.transaction_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Tanggal</p>
                      <p className="font-medium">{formatDate(selectedTransaction.created_at)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Pelanggan</p>
                      <p className="font-medium">{selectedTransaction.customer?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Kasir</p>
                      <p className="font-medium">{selectedTransaction.cashier?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Meja</p>
                      <p className="font-medium">{selectedTransaction.table?.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Pembayaran</p>
                      <p className="font-medium">{selectedTransaction.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Status</p>
                      <Chip
                        color={selectedTransaction.status === 'COMPLETED' ? 'success' : selectedTransaction.status === 'CANCELLED' ? 'danger' : 'warning'}
                        variant="soft"
                        size="sm"
                      >
                        {selectedTransaction.status}
                      </Chip>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-3">Item Pesanan</h4>
                    <div className="space-y-3">
                      {selectedTransaction.items?.map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-sm border-b pb-2">
                          <div>
                            <p className="font-medium">{item.variant ? `${item.product?.name} - ${item.variant.name}` : item.product?.name}</p>
                            <p className="text-muted-foreground text-xs">{item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}</p>
                          </div>
                          <p className="font-bold">Rp {Number(item.subtotal).toLocaleString('id-ID')}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 bg-slate-50 p-4 rounded-xl border">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">Rp {Number(selectedTransaction.subtotal).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pajak</span>
                      <span className="font-medium">Rp {Number(selectedTransaction.tax).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Diskon</span>
                      <span className="font-medium">Rp {Number(selectedTransaction.discount).toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold pt-2 border-t mt-2">
                      <span>Total Tagihan</span>
                      <span className="text-primary">Rp {Number(selectedTransaction.total_amount).toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onPress={() => setIsDetailsOpen(false)}>
              Tutup
            </Button>
            {isReceiptMode ? (
              <Button
                variant="primary"
                onPress={() => window.print()}
              >
                Cetak Sekarang
              </Button>
            ) : (
              <div className="flex gap-2">
                {selectedTransaction?.status === 'PENDING' && selectedTransaction.payment_method === 'QRIS' && (
                  <>
                    <Button
                      variant="secondary"
                      isDisabled={isActionLoading}
                      onPress={() => handleShowQris(selectedTransaction)}
                    >
                      <QrCode className="w-4 h-4 mr-2 inline" />
                      QRIS
                    </Button>
                    <Button
                      variant="secondary"
                      isDisabled={isActionLoading}
                      onPress={() => handleCheckQrisStatus(selectedTransaction)}
                    >
                      <RefreshCw className="w-4 h-4 mr-2 inline" />
                      Cek
                    </Button>
                    <Button
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      isDisabled={isActionLoading}
                      onPress={() => setConfirmAction({ type: "cancel-qris", transaction: selectedTransaction })}
                    >
                      Batalkan QRIS
                    </Button>
                  </>
                )}
                {selectedTransaction?.status === 'COMPLETED' && hasRole('admin') && (
                  <Button
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    isDisabled={isActionLoading}
                    onPress={() => setConfirmAction({ type: "void", transaction: selectedTransaction })}
                  >
                    Batalkan Transaksi
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onPress={() => setIsReceiptMode(true)}
                >
                  <Printer className="w-4 h-4 mr-2 inline" />
                  Cetak Struk
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isQrisOpen} onOpenChange={setIsQrisOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              QRIS Pending
            </DialogTitle>
          </DialogHeader>

          {qrisTransaction && (
            <div className="flex flex-col items-center gap-5 py-4 text-center">
              <div className="rounded-2xl border-2 border-dashed border-primary/30 bg-slate-50 p-4">
                <QRCodeSVG value={qrisTransaction.qris_string || ""} size={190} />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900">{qrisTransaction.transaction_number}</p>
                <p className="text-3xl font-black text-primary">
                  Rp {Number(qrisTransaction.total_amount).toLocaleString("id-ID")}
                </p>
                <p className="text-xs font-medium text-amber-600">Menunggu pembayaran pelanggan</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="secondary"
              isDisabled={!qrisTransaction || isActionLoading}
              onPress={() => qrisTransaction && handleCheckQrisStatus(qrisTransaction)}
            >
              <RefreshCw className="mr-2 h-4 w-4 inline" />
              Cek Status
            </Button>
            <Button variant="ghost" onPress={() => setIsQrisOpen(false)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              {confirmAction?.type === "void" ? "Batalkan Transaksi?" : "Batalkan QRIS Pending?"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-slate-600">
            <p>
              {confirmAction?.type === "void"
                ? "Transaksi selesai ini akan dibatalkan dan stok produk akan dikembalikan."
                : "Transaksi QRIS pending ini akan dibatalkan. Stok produk dan status meja akan dikembalikan."}
            </p>
            {confirmAction?.transaction && (
              <div className="rounded-xl border bg-slate-50 p-3">
                <div className="font-bold text-slate-900">{confirmAction.transaction.transaction_number}</div>
                <div className="mt-1 text-xs font-medium text-slate-500">
                  Total Rp {Number(confirmAction.transaction.total_amount).toLocaleString("id-ID")}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              isDisabled={isActionLoading}
              onPress={() => setConfirmAction(null)}
            >
              Tidak Jadi
            </Button>
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              isDisabled={isActionLoading || !confirmAction}
              onPress={() => {
                if (!confirmAction) return
                if (confirmAction.type === "cancel-qris") {
                  handleCancelPendingQris(confirmAction.transaction)
                  return
                }
                handleVoidTransaction()
              }}
            >
              {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmAction?.type === "void" ? "Batalkan Transaksi" : "Batalkan QRIS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
