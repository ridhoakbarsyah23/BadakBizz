"use client"

import { apiUrl } from "@/lib/api"
import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface RestockDialogProps {
  product: any
  onRestocked?: (quantity: number) => Promise<void> | void
}

const onlyDigits = (value: string) => value.replace(/\D/g, "")
const formatIndonesianNumber = (value: string) => {
  const digits = onlyDigits(value)
  return digits ? Number(digits).toLocaleString("id-ID") : ""
}

export function RestockDialog({ product, onRestocked }: RestockDialogProps) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedQuantity = Number(onlyDigits(quantity))

    if (!parsedQuantity || parsedQuantity < 1) {
      setError("Jumlah stok minimal 1.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch(apiUrl('/api/inventory/restock'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: parsedQuantity,
          notes: notes.trim() || null
        })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || "Gagal menambah stok")
      }

      setOpen(false)
      setQuantity("")
      setNotes("")
      await onRestocked?.(parsedQuantity)
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menambah stok.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button size="sm" variant="outline" className="h-8">
          <Plus className="w-4 h-4 mr-1" />
          Tambah Stok
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleRestock}>
          <DialogHeader>
            <DialogTitle>Tambah Stok Produk</DialogTitle>
            <DialogDescription>
              Tambahkan stok baru untuk produk <strong>{product.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="quantity">Jumlah</Label>
              <Input
                id="quantity"
                inputMode="numeric"
                placeholder="Misal: 50"
                value={formatIndonesianNumber(quantity)}
                onChange={(e) => setQuantity(onlyDigits(e.target.value))}
                required
                min="1"
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Keterangan (Opsional)</Label>
              <Input
                id="notes"
                placeholder="Catatan tambahan"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Stok"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
