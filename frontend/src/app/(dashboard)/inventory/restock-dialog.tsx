"use client"

import { apiUrl } from "@/lib/api"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Loader2 } from "lucide-react"
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

export function RestockDialog({ product }: { product: any }) {
  const [open, setOpen] = useState(false)
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch(apiUrl('/api/inventory/restock'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          product_id: product.id,
          quantity: parseInt(quantity),
          notes: notes
        })
      })

      if (!res.ok) {
        throw new Error("Gagal menambah stok")
      }

      alert(`Stok ${product.name} berhasil ditambahkan!`)
      setOpen(false)
      setQuantity("")
      setNotes("")
      
      // Refresh the page data
      router.refresh()
    } catch {
      alert("Terjadi kesalahan saat menambah stok.")
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
            <div className="space-y-2">
              <Label htmlFor="quantity">Jumlah</Label>
              <Input
                id="quantity"
                type="number"
                placeholder="Misal: 50"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
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
