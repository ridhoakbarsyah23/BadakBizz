"use client"

import { useEffect, useState } from "react"
import { Clock3, FolderOpen, Loader2, Save, ShoppingBag, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { apiUrl } from "@/lib/api"

export type SavedOrderItem = {
  id: number
  product_id: number | null
  variant_id: number | null
  display_name: string
  unit_price: number
  current_price: number | null
  current_stock: number
  quantity: number
  notes: string | null
  is_available: boolean
  price_changed: boolean
}

export type SavedOrder = {
  id: number
  name: string
  customer_id: number | null
  customer_name: string | null
  table_id: number | null
  table_name: string | null
  order_type: "dine_in" | "takeaway"
  custom_discount_percent: number
  notes: string | null
  item_count: number
  estimated_total: number
  items: SavedOrderItem[]
  updated_at: string
}

type DraftPayload = {
  customer_id: string | null
  table_id: string | null
  order_type: string
  custom_discount_percent: number
  notes?: string
  items: Array<{
    product_id: number
    variant_id?: number
    quantity: number
    notes?: string
  }>
}

type Props = {
  token: string | null
  draft: DraftPayload
  activeOrderId: number | null
  activeOrderName: string
  disabled?: boolean
  onRestore: (order: SavedOrder) => void
  onActiveOrderChange: (id: number | null, name?: string) => void
  onNotice: (notice: { type: "error" | "success" | "info"; message: string }) => void
}

const errorMessage = (data: any, fallback: string) => {
  const firstValidationError = data?.errors
    ? Object.values(data.errors).flat().find(Boolean)
    : null

  return String(firstValidationError || data?.message || fallback)
}

export function SavedOrdersDialog({
  token,
  draft,
  activeOrderId,
  activeOrderName,
  disabled,
  onRestore,
  onActiveOrderChange,
  onNotice,
}: Props) {
  const [orders, setOrders] = useState<SavedOrder[]>([])
  const [isListOpen, setIsListOpen] = useState(false)
  const [isSaveOpen, setIsSaveOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteCandidate, setDeleteCandidate] = useState<SavedOrder | null>(null)
  const [name, setName] = useState("")

  const fetchOrders = async (showLoading = false) => {
    if (!token) return
    if (showLoading) setIsLoading(true)

    try {
      const response = await fetch(apiUrl("/api/saved-orders"), {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(errorMessage(data, "Gagal memuat pesanan tersimpan."))
      }

      setOrders(Array.isArray(data) ? data : [])
    } catch (error: any) {
      onNotice({
        type: "error",
        message: error.message || "Gagal memuat pesanan tersimpan.",
      })
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [token])

  const openSaveDialog = () => {
    const fallbackName = `Pesanan ${new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })}`
    setName(activeOrderName || fallbackName)
    setIsSaveOpen(true)
  }

  const handleSave = async () => {
    if (!token || !name.trim() || draft.items.length === 0) return
    setIsSaving(true)

    try {
      const response = await fetch(apiUrl(activeOrderId ? `/api/saved-orders/${activeOrderId}` : "/api/saved-orders"), {
        method: activeOrderId ? "PUT" : "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...draft, name: name.trim() }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(errorMessage(data, "Gagal menyimpan pesanan."))
      }

      onActiveOrderChange(data.id, data.name)
      setIsSaveOpen(false)
      onNotice({
        type: "success",
        message: activeOrderId
          ? `Pesanan "${data.name}" berhasil diperbarui.`
          : `Pesanan "${data.name}" berhasil disimpan.`,
      })
      await fetchOrders()
    } catch (error: any) {
      onNotice({
        type: "error",
        message: error.message || "Gagal menyimpan pesanan.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!token || !deleteCandidate) return
    const candidate = deleteCandidate
    setDeletingId(candidate.id)

    try {
      const response = await fetch(apiUrl(`/api/saved-orders/${candidate.id}`), {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(errorMessage(data, "Gagal menghapus pesanan."))
      }

      setOrders((current) => current.filter((order) => order.id !== candidate.id))
      if (activeOrderId === candidate.id) onActiveOrderChange(null)
      setDeleteCandidate(null)
      onNotice({ type: "success", message: `Pesanan "${candidate.name}" dihapus.` })
    } catch (error: any) {
      onNotice({
        type: "error",
        message: error.message || "Gagal menghapus pesanan.",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (value: string) => new Date(value).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={openSaveDialog}
          disabled={disabled || draft.items.length === 0}
          title={activeOrderId ? "Perbarui pesanan tersimpan" : "Simpan pesanan saat ini"}
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">{activeOrderId ? "Perbarui" : "Simpan"}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setIsListOpen(true)
            fetchOrders(true)
          }}
          title="Buka pesanan tersimpan"
        >
          <FolderOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Tersimpan</span>
          {orders.length > 0 && (
            <span className="min-w-5 rounded-full bg-primary/10 px-1.5 text-xs font-bold text-primary">
              {orders.length}
            </span>
          )}
        </Button>
      </div>

      <Dialog open={isSaveOpen} onOpenChange={setIsSaveOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:!max-w-md">
          <DialogHeader>
            <DialogTitle>{activeOrderId ? "Perbarui Pesanan" : "Simpan Pesanan"}</DialogTitle>
            <DialogDescription>
              Keranjang disimpan sebagai draft dan belum mengurangi stok.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <label htmlFor="saved-order-name" className="text-sm font-semibold">Nama pesanan</label>
            <Input
              id="saved-order-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={80}
              placeholder="Contoh: Meja A1 - Budi"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSave()
              }}
            />
            <p className="text-xs text-muted-foreground">
              {draft.items.reduce((sum, item) => sum + item.quantity, 0)} item akan disimpan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveOpen(false)} disabled={isSaving}>Batal</Button>
            <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {activeOrderId ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isListOpen} onOpenChange={setIsListOpen}>
        <DialogContent className="flex max-h-[min(88dvh,720px)] w-[calc(100vw-2rem)] flex-col sm:!max-w-xl">
          <DialogHeader>
            <DialogTitle>Pesanan Tersimpan</DialogTitle>
            <DialogDescription>Pilih draft untuk melanjutkan pesanan di kasir ini.</DialogDescription>
          </DialogHeader>

          <div className="min-h-40 flex-1 space-y-2 overflow-y-auto pr-1">
            {isLoading ? (
              <div className="flex min-h-40 items-center justify-center text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Memuat pesanan...
              </div>
            ) : orders.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center text-center text-muted-foreground">
                <ShoppingBag className="mb-2 h-8 w-8 opacity-40" />
                <p className="font-semibold">Belum ada pesanan tersimpan</p>
              </div>
            ) : orders.map((order) => (
              <div key={order.id} className="flex items-center gap-3 rounded-lg border bg-background p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-bold">{order.name}</p>
                    {activeOrderId === order.id && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">Aktif</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                    {order.item_count} item | Rp {Number(order.estimated_total).toLocaleString("id-ID")}
                    {order.table_name ? ` | ${order.table_name}` : ""}
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock3 className="h-3 w-3" /> {formatDate(order.updated_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    onRestore(order)
                    setIsListOpen(false)
                  }}
                >
                  Lanjutkan
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteCandidate(order)}
                  aria-label={`Hapus ${order.name}`}
                  title={`Hapus ${order.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteCandidate)} onOpenChange={(open) => !open && setDeleteCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pesanan tersimpan?</AlertDialogTitle>
            <AlertDialogDescription>
              Draft &quot;{deleteCandidate?.name}&quot; akan dihapus permanen. Stok dan transaksi tidak terpengaruh.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>Batal</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete} disabled={deletingId !== null}>
              {deletingId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
