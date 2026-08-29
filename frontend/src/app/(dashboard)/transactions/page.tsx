"use client"

import { apiUrl } from "@/lib/api"
import React, { useState, useEffect } from "react"
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
import { AlertTriangle, Download, Eye, Filter, Loader2, Printer, QrCode, Receipt, RefreshCw, Search, XCircle } from "lucide-react"

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

const statusOptions = ["ALL", "PENDING", "COMPLETED", "CANCELLED"]
const paymentOptions = ["ALL", "QRIS", "CASH", "TRANSFER", "CARD"]

const statusLabel: Record<string, string> = {
  ALL: "Semua Status",
  PENDING: "Pending",
  COMPLETED: "Selesai",
  CANCELLED: "Batal",
}

const paymentLabel: Record<string, string> = {
  ALL: "Semua Pembayaran",
  QRIS: "QRIS",
  CASH: "Tunai",
  TRANSFER: "Transfer",
  CARD: "Kartu",
}

export default function TransactionsPage() {
  const { token, hasRole } = useAuth()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [appliedSearchQuery, setAppliedSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [paymentFilter, setPaymentFilter] = useState("ALL")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [qrisTransaction, setQrisTransaction] = useState<Transaction | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isQrisOpen, setIsQrisOpen] = useState(false)
  const [isReceiptMode, setIsReceiptMode] = useState(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [notice, setNotice] = useState<{
    type: "error" | "success" | "info"
    message: string
  } | null>(null)
  const [storeSettings, setStoreSettings] = useState<any>({
    name: "BadakBiz",
    address: "",
    phone: "",
    receipt_header: "BadakBiz",
    receipt_footer: "Thank you!"
  })

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "10",
      })

      if (statusFilter !== "ALL") params.set("status", statusFilter)
      if (paymentFilter !== "ALL") params.set("payment_method", paymentFilter)
      if (appliedSearchQuery) params.set("search", appliedSearchQuery)

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
  }, [token, currentPage, statusFilter, paymentFilter, appliedSearchQuery])

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

  const exportToCSV = () => {
    const headers = ["RECEIPT NO", "DATE", "CUSTOMER", "PAYMENT", "SUBTOTAL", "DISCOUNT", "SERVICE CHARGE", "TAX", "TOTAL", "STATUS"]
    const rows = transactions.map(trx => [
      trx.transaction_number,
      formatDate(trx.created_at),
      trx.customer?.name || "Walk-in",
      trx.payment_method,
      trx.subtotal,
      trx.discount,
      trx.service_charge,
      trx.tax,
      trx.total_amount,
      trx.status
    ])

    const csvContent = "data:text/csv;charset=utf-8,"
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `transactions_export_${new Date().getTime()}.csv`)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const applySearch = () => {
    setCurrentPage(1)
    setAppliedSearchQuery(searchQuery.trim())
  }

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
    if (!window.confirm(`Batalkan QRIS pending ${transaction.transaction_number}? Stok dan meja akan dikembalikan.`)) {
      return
    }

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

    if (!window.confirm("Apakah Anda yakin ingin membatalkan transaksi ini? Tindakan ini tidak dapat dibatalkan dan stok akan dikembalikan.")) {
      return;
    }

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
        }`}>
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
              setStatusFilter("PENDING")
              setPaymentFilter("QRIS")
              setCurrentPage(1)
            }}
          >
            Fokus Pending
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative flex-1 max-w-md">
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
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "primary" : "outline"}
              onPress={() => {
                setStatusFilter(status)
                setCurrentPage(1)
              }}
            >
              {statusLabel[status]}
            </Button>
          ))}
        </div>
        <select
          className="h-10 rounded-xl border border-default-200 bg-background px-3 text-sm font-medium shadow-sm"
          value={paymentFilter}
          onChange={(e) => {
            setPaymentFilter(e.target.value)
            setCurrentPage(1)
          }}
        >
          {paymentOptions.map((payment) => (
            <option key={payment} value={payment}>{paymentLabel[payment]}</option>
          ))}
        </select>
        <Button variant="outline" onPress={applySearch}>
          <Filter className="h-4 w-4 mr-2" inline-block="true" />
          Terapkan
        </Button>
        <Button variant="outline" onPress={exportToCSV}>
          <Download className="h-4 w-4 mr-2" inline-block="true" />
          Ekspor CSV
        </Button>
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
                        {trx.status}
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
              <div id="printable-receipt" className="w-full p-5 print:p-0 bg-white text-black text-sm print:text-xs font-mono flex flex-col gap-2 rounded-xl border print:border-none print:shadow-none mb-2 print:m-0 print:w-[300px] print:absolute print:top-0 print:left-0">
                <div className="text-center font-bold text-lg print:text-base mb-1">
                  {storeSettings.receipt_header || storeSettings.name || 'BADAKBIZ'}
                </div>
                <div className="text-center text-xs print:text-[10px] font-normal text-gray-600 print:text-black mb-3 whitespace-pre-line">
                  {storeSettings.address || 'Alamat Toko'}{storeSettings.address ? '\n' : ''}
                  Telp: {storeSettings.phone || '-'}
                </div>

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2"></div>

                <div className="flex justify-between text-xs print:text-[10px] mb-2 font-medium text-gray-600 print:text-black">
                  <span>{formatDate(selectedTransaction.created_at)}</span>
                  <span>{selectedTransaction.transaction_number}</span>
                </div>
                <div className="text-left text-xs print:text-[10px] mb-2 font-medium text-gray-600 print:text-black">
                  Pelanggan: {selectedTransaction.customer?.name || 'Walk-in'}
                </div>
                {selectedTransaction.table && (
                  <div className="text-left text-xs print:text-[10px] mb-2 font-medium text-gray-600 print:text-black">
                    Meja: {selectedTransaction.table.name}
                  </div>
                )}

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 flex flex-col gap-2">
                  {selectedTransaction.items?.map((item: any, i: number) => (
                    <div key={i} className="flex flex-col">
                      <div className="flex justify-between font-bold print:font-semibold print:text-black">
                        <span className="truncate pr-2">{item.variant ? `${item.product?.name} - ${item.variant.name}` : item.product?.name}</span>
                        <span className="whitespace-nowrap">Rp {Number(item.subtotal).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="text-xs print:text-[10px] text-gray-500 print:text-black">
                        {item.quantity} x Rp {Number(item.price).toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-xs print:text-[10px] print:text-black">
                  <span>Subtotal</span>
                  <span>Rp {Number(selectedTransaction.subtotal).toLocaleString("id-ID")}</span>
                </div>
                {Number(selectedTransaction.discount) > 0 && (
                  <div className="flex justify-between text-xs print:text-[10px] print:text-black">
                    <span>Diskon</span>
                    <span>- Rp {Number(selectedTransaction.discount).toLocaleString("id-ID")}</span>
                  </div>
                )}
                {Number(selectedTransaction.service_charge) > 0 && (
                  <div className="flex justify-between text-xs print:text-[10px] print:text-black">
                    <span>Biaya Layanan</span>
                    <span>Rp {Number(selectedTransaction.service_charge).toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs print:text-[10px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Pajak</span>
                  <span>Rp {Number(selectedTransaction.tax).toLocaleString("id-ID")}</span>
                </div>

                <div className="flex justify-between font-black text-lg print:text-base mb-2 print:text-black">
                  <span>TOTAL</span>
                  <span>Rp {Number(selectedTransaction.total_amount).toLocaleString("id-ID")}</span>
                </div>

                <div className="flex justify-between text-xs print:text-[10px] print:text-black">
                  <span>Bayar ({selectedTransaction.payment_method})</span>
                  <span>Rp {Number(selectedTransaction.payment_amount).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-xs print:text-[10px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Kembali</span>
                  <span className="font-bold">Rp {(Number(selectedTransaction.payment_amount) - Number(selectedTransaction.total_amount)).toLocaleString("id-ID")}</span>
                </div>

                <div className="text-center text-xs print:text-[10px] mt-2 print:mt-1 italic text-gray-500 print:text-black whitespace-pre-line">
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
                      onPress={() => handleCancelPendingQris(selectedTransaction)}
                    >
                      Batalkan QRIS
                    </Button>
                  </>
                )}
                {selectedTransaction?.status === 'COMPLETED' && hasRole('admin') && (
                  <Button
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    isDisabled={isActionLoading}
                    onPress={handleVoidTransaction}
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
    </div>
  )
}
