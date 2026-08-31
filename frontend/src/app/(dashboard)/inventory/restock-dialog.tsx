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
const variantLabel = (product: any, variant: any) => {
  const price = Number(product?.selling_price || 0) + Number(variant?.price_adjustment || 0)
  const sku = variant?.sku ? ` - ${variant.sku}` : ""

  return `${variant.name}${sku} - stok ${variant.stock} - Rp ${price.toLocaleString("id-ID")}`
}

export function RestockDialog({ product, onRestocked }: RestockDialogProps) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [variantId, setVariantId] = useState("")
  const [quantity, setQuantity] = useState("")
  const [notes, setNotes] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const variants = Array.isArray(product.variants) ? product.variants : []
  const selectedVariant = variants.find((variant: any) => variant.id.toString() === variantId)

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsedQuantity = Number(onlyDigits(quantity))

    if (product.has_variants && !variantId) {
      setError("Pilih varian yang akan ditambah stoknya.")
      return
    }

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
          variant_id: product.has_variants ? Number(variantId) : null,
          quantity: parsedQuantity,
          notes: notes.trim() || null
        })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || "Gagal menambah stok")
      }

      setOpen(false)
      setVariantId("")
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
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setVariantId("")
          setQuantity("")
          setNotes("")
          setError("")
        }
      }}
    >
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
            {product.has_variants && (
              <div className="space-y-2">
                <Label htmlFor={`restock-variant-${product.id}`}>Varian</Label>
                <select
                  id={`restock-variant-${product.id}`}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  disabled={isLoading}
                  required
                >
                  <option value="">Pilih varian</option>
                  {variants.map((variant: any) => (
                    <option key={variant.id} value={variant.id.toString()}>
                      {variantLabel(product, variant)}
                    </option>
                  ))}
                </select>
                {selectedVariant && (
                  <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    Target stok: <span className="font-bold text-slate-900">{selectedVariant.name}</span>
                    {selectedVariant.sku ? ` (${selectedVariant.sku})` : ""}, stok saat ini {selectedVariant.stock}.
                  </div>
                )}
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
