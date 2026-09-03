"use client"

import { apiUrl } from "@/lib/api"
import { useState } from "react"
import { ArrowRightLeft, Loader2 } from "lucide-react"
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

interface AdjustStockDialogProps {
  product: any
  onAdjusted?: (product: any, difference: number) => Promise<void> | void
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
const reasonPresets = ["Stock opname", "Rusak", "Hilang", "Salah input", "Retur pelanggan"]

export function AdjustStockDialog({ product, onAdjusted }: AdjustStockDialogProps) {
  const { token } = useAuth()
  const [open, setOpen] = useState(false)
  const [variantId, setVariantId] = useState("")
  const [actualStock, setActualStock] = useState("")
  const [reason, setReason] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const variants = Array.isArray(product.variants) ? product.variants : []
  const selectedVariant = variants.find((variant: any) => variant.id.toString() === variantId)
  const currentStock = product.has_variants
    ? Number(selectedVariant?.stock || 0)
    : Number(product.stock || 0)
  const parsedActualStock = actualStock === "" ? null : Number(onlyDigits(actualStock))
  const difference = parsedActualStock === null ? 0 : parsedActualStock - currentStock

  const resetForm = () => {
    setVariantId("")
    setActualStock("")
    setReason("")
    setError("")
  }

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault()

    if (product.has_variants && !variantId) {
      setError("Pilih varian yang ingin disesuaikan.")
      return
    }

    if (parsedActualStock === null || parsedActualStock < 0) {
      setError("Stok aktual wajib diisi minimal 0.")
      return
    }

    if (difference === 0) {
      setError("Stok aktual sama dengan stok sistem.")
      return
    }

    if (!reason.trim()) {
      setError("Alasan penyesuaian wajib diisi.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const res = await fetch(apiUrl("/api/inventory/adjust"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          product_id: product.id,
          variant_id: product.has_variants ? Number(variantId) : null,
          actual_stock: parsedActualStock,
          reason: reason.trim()
        })
      })
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.message || "Gagal menyesuaikan stok")
      }

      setOpen(false)
      resetForm()
      await onAdjusted?.(data.product, difference)
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyesuaikan stok.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) resetForm()
      }}
    >
      <DialogTrigger render={
        <Button size="sm" variant="ghost" className="h-8">
          <ArrowRightLeft className="w-4 h-4 mr-1" />
          Sesuaikan
        </Button>
      } />
      <DialogContent className="sm:max-w-[460px]">
        <form onSubmit={handleAdjust}>
          <DialogHeader>
            <DialogTitle>Penyesuaian Stok</DialogTitle>
            <DialogDescription>
              Set stok aktual untuk <strong>{product.name}</strong> berdasarkan hitung fisik.
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
                <Label htmlFor={`variant-${product.id}`}>Varian</Label>
                <select
                  id={`variant-${product.id}`}
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
            <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Stok sistem</span>
                <span className="font-bold text-slate-900">{product.has_variants && !selectedVariant ? "-" : currentStock}</span>
              </div>
              {parsedActualStock !== null && (!product.has_variants || selectedVariant) && (
                <div className={`mt-1 flex justify-between font-semibold ${difference < 0 ? "text-red-600" : "text-emerald-600"}`}>
                  <span>Selisih</span>
                  <span>{difference > 0 ? "+" : ""}{difference}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`actual-stock-${product.id}`}>Stok Aktual</Label>
              <Input
                id={`actual-stock-${product.id}`}
                inputMode="numeric"
                placeholder="Misal: 48"
                value={formatIndonesianNumber(actualStock)}
                onChange={(e) => setActualStock(onlyDigits(e.target.value))}
                disabled={isLoading}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`reason-${product.id}`}>Alasan</Label>
              <div className="flex flex-wrap gap-2">
                {reasonPresets.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    size="xs"
                    variant={reason === preset ? "default" : "outline"}
                    onClick={() => setReason(preset)}
                    disabled={isLoading}
                  >
                    {preset}
                  </Button>
                ))}
              </div>
              <Input
                id={`reason-${product.id}`}
                placeholder="Misal: Stock opname / rusak / hilang"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isLoading}
                required
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
                "Simpan Penyesuaian"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
