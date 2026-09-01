"use client"

import { apiUrl } from "@/lib/api"
import { AutoDismissNotice } from "@/components/auto-dismiss-notice"
import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { 
  Button, 
} from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, Search, Filter, Wand2, X, ImageIcon, Upload, ChevronDown } from "lucide-react"

interface Category {
  id: number
  name: string
}

interface Product {
  id: number
  sku: string
  name: string
  category_id: number | null
  category?: Category
  purchase_price: string
  selling_price: string
  stock: number
  minimum_stock: number
  is_active: boolean
  barcode?: string
  image_path?: string | null
  image_url?: string | null
  unit?: string
  has_variants?: boolean
  variants?: ProductVariant[]
}

interface ProductVariant {
  id: number
  name: string
  sku: string | null
  price_adjustment: string | number
  stock: number
}

interface VariantForm {
  id?: number;
  name: string;
  sku: string;
  price_adjustment: number;
  stock: number;
}

interface ProductForm {
  sku: string;
  name: string;
  category_id: string;
  purchase_price: string;
  selling_price: string;
  stock: string;
  minimum_stock: string;
  barcode: string;
  unit: string;
  has_variants: boolean;
  variants: VariantForm[];
}

const initialForm: ProductForm = {
  sku: "",
  name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  stock: "0",
  minimum_stock: "0",
  barcode: "",
  unit: "pcs",
  has_variants: false,
  variants: []
}

const onlyDigits = (value: string | number | null | undefined) => {
  return String(value ?? "").replace(/\D/g, "")
}

const parseIndonesianNumber = (value: string | number | null | undefined) => {
  return Number(onlyDigits(value)) || 0
}

const formatIndonesianNumber = (value: string | number | null | undefined) => {
  const digits = onlyDigits(value)
  return digits ? Number(digits).toLocaleString("id-ID") : ""
}

const formatSkuInput = (value: string) =>
  value
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

const productStock = (product: Product) => product.has_variants
  ? (product.variants || []).reduce((sum, variant) => sum + Number(variant.stock || 0), 0)
  : Number(product.stock || 0)

const variantPrice = (basePrice: string | number, variant: VariantForm) =>
  parseIndonesianNumber(basePrice) + Number(variant.price_adjustment || 0)

export default function ProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [stockFilter, setStockFilter] = useState("")
  const [variantFilter, setVariantFilter] = useState("")
  const [photoFilter, setPhotoFilter] = useState("")
  const [expandedProductIds, setExpandedProductIds] = useState<Set<number>>(new Set())
  
  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState(initialForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState("")
  const [removeImage, setRemoveImage] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingSku, setIsGeneratingSku] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, action: null as any, title: "", desc: "" })
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, currentPage, searchQuery, categoryFilter, statusFilter, stockFilter, variantFilter, photoFilter])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const headers = { "Authorization": `Bearer ${token}` }
      const params = new URLSearchParams({
        page: currentPage.toString(),
        per_page: "10",
      })

      if (searchQuery.trim()) params.set("search", searchQuery.trim())
      if (categoryFilter) params.set("category_id", categoryFilter)
      if (statusFilter) params.set("status", statusFilter)
      if (stockFilter) params.set("stock_status", stockFilter)
      if (variantFilter) params.set("variant_type", variantFilter)
      if (photoFilter) params.set("photo", photoFilter)

      const [prodRes, catRes] = await Promise.all([
        fetch(apiUrl(`/api/products?${params.toString()}`), { headers }),
        fetch(apiUrl('/api/categories'), { headers })
      ])
      
      const prodData = await prodRes.json()
      const catData = await catRes.json()
      
      if (prodData && prodData.data) {
        setProducts(prodData.data)
        setTotalPages(prodData.last_page || 1)
      } else {
        setProducts(Array.isArray(prodData) ? prodData : [])
        setTotalPages(1)
      }
      setCategories(Array.isArray(catData) ? catData : [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updateFilter = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    setCurrentPage(1)
    setter(value)
  }

  const hasActiveFilters = Boolean(
    searchQuery || categoryFilter || statusFilter || stockFilter || variantFilter || photoFilter
  )

  const resetFilters = () => {
    setCurrentPage(1)
    setSearchQuery("")
    setCategoryFilter("")
    setStatusFilter("")
    setStockFilter("")
    setVariantFilter("")
    setPhotoFilter("")
  }

  const toggleVariantDetails = (productId: number) => {
    setExpandedProductIds(prev => {
      const next = new Set(prev)

      if (next.has(productId)) {
        next.delete(productId)
      } else {
        next.add(productId)
      }

      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmConfig({
      isOpen: true,
      title: "Simpan Perubahan",
      desc: `Apakah Anda yakin ingin ${editingId ? 'memperbarui' : 'menambahkan'} produk ini?`,
      action: executeSubmit
    })
  }

  const executeSubmit = async () => {
    setIsSubmitting(true)
    setError("")
    const actionLabel = editingId ? "diperbarui" : "ditambahkan"

    try {
      const url = editingId 
        ? apiUrl(`/api/products/${editingId}`)
        : apiUrl('/api/products')

      const payload = {
        ...formData,
        category_id: formData.category_id || null,
        purchase_price: parseIndonesianNumber(formData.purchase_price),
        selling_price: parseIndonesianNumber(formData.selling_price),
        stock: parseIndonesianNumber(formData.stock),
        minimum_stock: parseIndonesianNumber(formData.minimum_stock),
        barcode: formData.barcode,
        unit: formData.unit,
        has_variants: formData.has_variants,
        variants: formData.variants.map(variant => ({
          ...variant,
          price_adjustment: parseIndonesianNumber(variant.price_adjustment),
          stock: parseIndonesianNumber(variant.stock),
        })),
      }

      const body = new FormData()
      if (editingId) {
        body.append("_method", "PUT")
      }
      body.append("variants_present", "1")
      Object.entries(payload).forEach(([key, value]) => {
        if (key === "variants") {
          ;(value as VariantForm[]).forEach((variant, index) => {
            if (variant.id) {
              body.append(`variants[${index}][id]`, String(variant.id))
            }
            body.append(`variants[${index}][name]`, variant.name)
            body.append(`variants[${index}][sku]`, variant.sku || "")
            body.append(`variants[${index}][price_adjustment]`, String(variant.price_adjustment || 0))
            body.append(`variants[${index}][stock]`, String(variant.stock || 0))
          })
          return
        }

        if (typeof value === "boolean") {
          body.append(key, value ? "1" : "0")
          return
        }

        body.append(key, value === null || value === undefined ? "" : String(value))
      })

      if (imageFile) {
        body.append("image", imageFile)
      }

      if (removeImage) {
        body.append("remove_image", "1")
      }
        
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan produk")
      }

      await fetchData()
      setIsFormOpen(false)
      setImageFile(null)
      setImagePreview("")
      setRemoveImage(false)
      setNotice({
        type: "success",
        message: `Produk ${formData.name} berhasil ${actionLabel}.`,
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteProduct) return
    setIsSubmitting(true)
    const productName = deleteProduct.name
    try {
      const res = await fetch(apiUrl(`/api/products/${deleteProduct.id}`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.message || "Gagal menghapus produk")
      
      await fetchData()
      setIsDeleteOpen(false)
      setNotice({
        type: "success",
        message: `Produk ${productName} berhasil dihapus.`,
      })
    } catch (err: any) {
      setNotice({
        type: "error",
        message: err.message || "Gagal menghapus produk.",
      })
    } finally {
      setIsSubmitting(false)
      setDeleteProduct(null)
    }
  }

  const openEdit = (product: Product) => {
    setNotice(null)
    setEditingId(product.id)
    setFormData({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id ? product.category_id.toString() : "",
      purchase_price: onlyDigits(product.purchase_price),
      selling_price: onlyDigits(product.selling_price),
      stock: product.stock.toString(),
      minimum_stock: product.minimum_stock.toString(),
      barcode: product.barcode || "",
      unit: product.unit || "pcs",
      has_variants: product.has_variants || false,
      variants: (product.variants || []).map((variant) => ({
        id: variant.id,
        name: variant.name,
        sku: variant.sku || "",
        price_adjustment: Number(variant.price_adjustment || 0),
        stock: Number(variant.stock || 0),
      }))
    })
    setImageFile(null)
    setImagePreview(product.image_url || "")
    setRemoveImage(false)
    setIsFormOpen(true)
  }

  const openCreate = () => {
    setNotice(null)
    setEditingId(null)
    setFormData({
      ...initialForm,
      sku: ""
    })
    setImageFile(null)
    setImagePreview("")
    setRemoveImage(false)
    setError("")
    setIsFormOpen(true)
  }

  const handleGenerateSKU = async () => {
    if (!formData.name.trim()) {
      setError("Isi nama produk sebelum membuat SKU otomatis.")
      return
    }

    setIsGeneratingSku(true)
    setError("")

    try {
      const params = new URLSearchParams({ name: formData.name.trim() })
      if (formData.category_id) {
        params.set("category_id", formData.category_id)
      }
      if (editingId) {
        params.set("product_id", editingId.toString())
      }

      const res = await fetch(apiUrl(`/api/products/next-sku?${params.toString()}`), {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal membuat SKU otomatis")
      }

      setFormData(prev => ({ ...prev, sku: data.sku }))
    } catch (err: any) {
      setError(err.message || "Gagal membuat SKU otomatis")
    } finally {
      setIsGeneratingSku(false)
    }
  }

  const openDelete = (product: Product) => {
    setDeleteProduct(product)
    setIsDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Data Produk</h1>
          <p className="text-muted-foreground">
            Kelola detail produk dan stok Anda.
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger render={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Produk
            </Button>
          } />
          <DialogContent className="max-h-[92dvh] w-[96vw] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
              <DialogDescription>Isi data produk sesuai format yang biasa dipakai di Indonesia.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[120px_1fr] sm:items-center">
                <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt={formData.name ? `Foto ${formData.name}` : "Preview foto produk"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="image">Foto Produk</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="image"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null
                        setImageFile(file)
                        setRemoveImage(false)
                        setImagePreview(file ? URL.createObjectURL(file) : imagePreview)
                      }}
                    />
                    {(imagePreview || imageFile) && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setImageFile(null)
                          setImagePreview("")
                          setRemoveImage(true)
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Hapus
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    JPG, PNG, atau WebP maksimal 2 MB.
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Input 
                      id="sku"
                      required
                      placeholder="cth. MIN-KOP-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: formatSkuInput(e.target.value) })}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="shrink-0"
                      onClick={handleGenerateSKU}
                      disabled={isGeneratingSku}
                      title="Buat SKU Otomatis"
                    >
                      {isGeneratingSku ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name"
                    required
                    placeholder="cth. Kopi Gula Aren"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode (Opsional)</Label>
                  <Input 
                    id="barcode"
                    inputMode="numeric"
                    placeholder="Scan atau ketik nomor barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: onlyDigits(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori</Label>
                  <select 
                    id="category"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  >
                    <option value="">Pilih kategori</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="unit">Satuan Produk <span className="text-destructive">*</span></Label>
                  <select 
                    id="unit"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="pcs">Pcs / Buah</option>
                    <option value="porsi">Porsi</option>
                    <option value="cup">Cup / Gelas</option>
                    <option value="pack">Pack / Bungkus</option>
                    <option value="botol">Botol</option>
                    <option value="kg">Kilogram (kg)</option>
                    <option value="gr">Gram (gr)</option>
                    <option value="ltr">Liter (L)</option>
                    <option value="ml">Mililiter (ml)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Switch 
                    id="has_variants" 
                    checked={formData.has_variants}
                    onCheckedChange={(checked) => setFormData({ ...formData, has_variants: checked })}
                  />
                  <Label htmlFor="has_variants">Produk punya varian?</Label>
                </div>
              </div>

              {formData.has_variants && (
                <div className="space-y-4 rounded-md border bg-muted/20 p-4">
                  <div className="flex justify-between items-center">
                    <Label>Varian Produk</Label>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setFormData({ ...formData, variants: [...(formData.variants || []), { name: '', sku: '', price_adjustment: 0, stock: 0 }] })}
                    >
                      <Plus className="w-4 h-4 mr-1" /> Tambah Varian
                    </Button>
                  </div>
                  {(!formData.variants || formData.variants.length === 0) ? (
                    <div className="text-sm text-muted-foreground text-center py-2">Belum ada varian. Klik &quot;Tambah Varian&quot;.</div>
                  ) : (
                    formData.variants.map((variant, index) => {
                      const finalPrice = variantPrice(formData.selling_price, variant)

                      return (
                      <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border bg-white p-3 sm:grid-cols-12 sm:items-center">
                        <div className="sm:col-span-4">
                          <Input
                            placeholder="Varian, cth. Panas / Dingin"
                            value={variant.name}
                            onChange={(e) => {
                              const newVariants = [...formData.variants!];
                              newVariants[index].name = e.target.value;
                              setFormData({ ...formData, variants: newVariants });
                            }} 
                            required
                          />
                        </div>
                        <div className="sm:col-span-3">
                          <Input
                            placeholder="SKU varian"
                            value={variant.sku}
                            onChange={(e) => {
                              const newVariants = [...formData.variants!];
                              newVariants[index].sku = formatSkuInput(e.target.value);
                              setFormData({ ...formData, variants: newVariants });
                            }} 
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                            <Input
                              inputMode="numeric"
                              placeholder="0"
                              className="pl-9 text-right"
                              value={formatIndonesianNumber(variant.price_adjustment)}
                              onChange={(e) => {
                                const newVariants = [...formData.variants!];
                                newVariants[index].price_adjustment = parseIndonesianNumber(e.target.value);
                                setFormData({ ...formData, variants: newVariants });
                              }}
                            />
                          </div>
                          <div className="mt-1 text-[11px] font-medium text-muted-foreground">
                            Jual: Rp {finalPrice.toLocaleString("id-ID")}
                          </div>
                        </div>
                        <div className="sm:col-span-2">
                          <Input 
                            inputMode="numeric"
                            placeholder="Stok" 
                            className="text-right"
                            value={formatIndonesianNumber(variant.stock)}
                            onChange={(e) => {
                              const newVariants = [...formData.variants!];
                              newVariants[index].stock = parseIndonesianNumber(e.target.value);
                              setFormData({ ...formData, variants: newVariants });
                            }} 
                          />
                        </div>
                        <div className="flex justify-end sm:col-span-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              const newVariants = [...formData.variants!];
                              newVariants.splice(index, 1);
                              setFormData({ ...formData, variants: newVariants });
                            }}
                          >
                            <X className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      )
                    })
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Harga Beli (Rp) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                    <Input
                      id="purchase_price"
                      required
                      inputMode="numeric"
                      placeholder="0"
                      className="pl-9 text-right"
                      value={formatIndonesianNumber(formData.purchase_price)}
                      onChange={(e) => setFormData({ ...formData, purchase_price: onlyDigits(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Harga Jual (Rp) <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                    <Input
                      id="selling_price"
                      required
                      inputMode="numeric"
                      placeholder="0"
                      className="pl-9 text-right"
                      value={formatIndonesianNumber(formData.selling_price)}
                      onChange={(e) => setFormData({ ...formData, selling_price: onlyDigits(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stok Saat Ini <span className="text-destructive">*</span></Label>
                  <Input 
                    id="stock"
                    required
                    inputMode="numeric"
                    placeholder="0"
                    className="text-right"
                    value={formatIndonesianNumber(formData.stock)}
                    onChange={(e) => setFormData({ ...formData, stock: onlyDigits(e.target.value) || "0" })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Minimal Stok <span className="text-destructive">*</span></Label>
                  <Input 
                    id="minimum_stock"
                    required
                    inputMode="numeric"
                    placeholder="0"
                    className="text-right"
                    value={formatIndonesianNumber(formData.minimum_stock)}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: onlyDigits(e.target.value) || "0" })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <AutoDismissNotice notice={notice} onDismiss={() => setNotice(null)} />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_repeat(5,minmax(140px,180px))_auto]">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, SKU, barcode..."
            className="pl-8 w-full"
            value={searchQuery}
            onChange={(e) => updateFilter(setSearchQuery, e.target.value)}
          />
        </div>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={categoryFilter}
          onChange={(e) => updateFilter(setCategoryFilter, e.target.value)}
        >
          <option value="">Semua kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
          ))}
        </select>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={statusFilter}
          onChange={(e) => updateFilter(setStatusFilter, e.target.value)}
        >
          <option value="">Semua status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={stockFilter}
          onChange={(e) => updateFilter(setStockFilter, e.target.value)}
        >
          <option value="">Semua stok</option>
          <option value="safe">Stok aman</option>
          <option value="low">Stok menipis</option>
          <option value="out">Stok habis</option>
        </select>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={variantFilter}
          onChange={(e) => updateFilter(setVariantFilter, e.target.value)}
        >
          <option value="">Semua tipe</option>
          <option value="with_variants">Dengan varian</option>
          <option value="without_variants">Tanpa varian</option>
        </select>
        <select
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          value={photoFilter}
          onChange={(e) => updateFilter(setPhotoFilter, e.target.value)}
        >
          <option value="">Semua foto</option>
          <option value="with_photo">Ada foto</option>
          <option value="without_photo">Belum ada foto</option>
        </select>
        <Button variant="secondary" onClick={resetFilters} disabled={!hasActiveFilters}>
          {hasActiveFilters ? <X className="mr-2 h-4 w-4" /> : <Filter className="mr-2 h-4 w-4" />}
          Reset
        </Button>
      </div>

      <div className="bg-background rounded-lg border shadow-sm overflow-x-auto w-full">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>FOTO</TableHead>
                <TableHead>NAMA PRODUK</TableHead>
                <TableHead>KATEGORI</TableHead>
                <TableHead>HARGA</TableHead>
                <TableHead>STOK</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Tidak ada produk yang ditemukan. Tambahkan produk untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => {
                  const stock = productStock(product)
                  const isLowStock = stock <= product.minimum_stock
                  const variants = product.variants || []
                  const isExpanded = expandedProductIds.has(product.id)
                  const availableVariants = product.has_variants
                    ? variants.filter((variant) => Number(variant.stock || 0) > 0).length
                    : 0

                  return (
                    <React.Fragment key={product.id}>
                      <TableRow>
                        <TableCell className="py-3 px-4 font-medium">{product.sku}</TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={`Foto ${product.name}`}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="font-medium">{product.name}</div>
                          {product.has_variants && (
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-semibold">
                                {availableVariants}/{variants.length} varian aktif
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="py-3 px-4 text-muted-foreground">{product.category?.name || '-'}</TableCell>
                        <TableCell className="py-3 px-4">Rp {Number(product.selling_price).toLocaleString('id-ID')}</TableCell>
                        <TableCell className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={isLowStock ? "text-destructive font-bold" : ""}>
                              {stock}
                            </span>
                            {product.has_variants && (
                              <span className="text-xs text-muted-foreground">total varian</span>
                            )}
                            {isLowStock && (
                              <Badge variant="destructive" className="h-5 px-1 text-[10px]">Menipis</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-4">
                          <Badge variant={product.is_active ? "secondary" : "outline"} className={product.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                            {product.is_active ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={!product.has_variants || variants.length === 0}
                              onClick={() => toggleVariantDetails(product.id)}
                              title={isExpanded ? "Tutup detail varian" : "Lihat detail varian"}
                            >
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                              <Edit2 className="w-4 h-4 text-muted-foreground" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openDelete(product)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/20 px-4 py-3">
                            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                              {variants.map((variant) => {
                                const variantStock = Number(variant.stock || 0)
                                const variantIsLow = variantStock <= Number(product.minimum_stock || 0)
                                const finalPrice = Number(product.selling_price || 0) + Number(variant.price_adjustment || 0)

                                return (
                                  <div key={variant.id} className="grid grid-cols-[1fr_auto] gap-3 rounded-md border bg-background p-3">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-semibold text-foreground">{variant.name}</div>
                                      <div className="mt-1 flex flex-wrap gap-1.5">
                                        <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                                          {variant.sku || "Tanpa SKU"}
                                        </Badge>
                                        <Badge variant={variantStock > 0 ? "secondary" : "destructive"} className="h-5 px-1.5 text-[10px]">
                                          Stok {variantStock}
                                        </Badge>
                                        {variantIsLow && variantStock > 0 && (
                                          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Menipis</Badge>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-bold text-foreground">
                                        Rp {finalPrice.toLocaleString("id-ID")}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground">
                                        +Rp {Number(variant.price_adjustment || 0).toLocaleString("id-ID")}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 px-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Sebelumnya
          </Button>
          <span className="text-sm text-muted-foreground font-medium">
            Halaman {currentPage} dari {totalPages}
          </span>
          <Button 
            variant="outline" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Selanjutnya
          </Button>
        </div>
      )}

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <DialogTitle>Hapus Produk</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus produk <strong>{deleteProduct?.name}</strong>? 
              <br />Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmConfig.isOpen} onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmConfig.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => {
              e.preventDefault();
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              if (confirmConfig.action) {
                setTimeout(() => confirmConfig.action(), 100);
              }
            }}>Konfirmasi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
