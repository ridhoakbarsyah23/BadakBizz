"use client"

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
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, Search, Filter, Wand2 } from "lucide-react"

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
}

const initialForm = {
  sku: "",
  name: "",
  category_id: "",
  purchase_price: "",
  selling_price: "",
  stock: "0",
  minimum_stock: "0"
}

export default function ProductsPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, action: null as any, title: "", desc: "" })
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, currentPage])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const headers = { "Authorization": `Bearer ${token}` }
      const [prodRes, catRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/products?page=${currentPage}&per_page=10`, { headers }),
        fetch("http://127.0.0.1:8000/api/categories", { headers })
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

    try {
      const url = editingId 
        ? `http://127.0.0.1:8000/api/products/${editingId}`
        : "http://127.0.0.1:8000/api/products"
        
      const payload = {
        ...formData,
        category_id: formData.category_id || null,
        purchase_price: parseFloat(formData.purchase_price) || 0,
        selling_price: parseFloat(formData.selling_price) || 0,
        stock: parseInt(formData.stock) || 0,
        minimum_stock: parseInt(formData.minimum_stock) || 0,
      }
        
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan produk")
      }

      await fetchData()
      setIsFormOpen(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteProduct) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/products/${deleteProduct.id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Gagal menghapus produk")
      
      await fetchData()
      setIsDeleteOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
      setDeleteProduct(null)
    }
  }

  const openEdit = (product: Product) => {
    setEditingId(product.id)
    setFormData({
      sku: product.sku,
      name: product.name,
      category_id: product.category_id ? product.category_id.toString() : "",
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock: product.stock.toString(),
      minimum_stock: product.minimum_stock.toString()
    })
    setIsFormOpen(true)
  }

  const openCreate = () => {
    setEditingId(null)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setFormData({
      ...initialForm,
      sku: `PRD-${randomSuffix}`
    })
    setError("")
    setIsFormOpen(true)
  }

  const handleGenerateSKU = () => {
    let catStr = "PRD";
    let nameStr = "ITM";
    
    if (formData.category_id) {
      const cat = categories.find(c => c.id.toString() === formData.category_id.toString());
      if (cat && cat.name) {
        catStr = cat.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      }
    }
    
    if (formData.name) {
      const words = formData.name.trim().split(' ');
      if (words.length > 1) {
        nameStr = words.map(w => w[0]).join('').substring(0, 3).toUpperCase();
      } else {
        nameStr = formData.name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
      }
    }
    
    catStr = catStr || "PRD";
    nameStr = nameStr || "ITM";
    
    const randomNum = String(Math.floor(1 + Math.random() * 999)).padStart(3, '0');
    setFormData(prev => ({ ...prev, sku: `${catStr}-${nameStr}-${randomNum}` }));
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
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Produk" : "Tambah Produk Baru"}</DialogTitle>
              <DialogDescription>Lengkapi detail produk di bawah ini.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU <span className="text-destructive">*</span></Label>
                  <div className="flex gap-2">
                    <Input 
                      id="sku"
                      required
                      placeholder="cth. MIN-KOP-001"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="shrink-0"
                      onClick={handleGenerateSKU}
                      title="Buat SKU Otomatis"
                    >
                      <Wand2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Produk <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name"
                    required
                    placeholder="e.g., Kopi Gula Aren"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Harga Beli (Rp) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="purchase_price"
                    required
                    type="number"
                    min="0"
                    value={formData.purchase_price}
                    onChange={(e) => setFormData({ ...formData, purchase_price: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="selling_price">Harga Jual (Rp) <span className="text-destructive">*</span></Label>
                  <Input 
                    id="selling_price"
                    required
                    type="number"
                    min="0"
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stok Saat Ini <span className="text-destructive">*</span></Label>
                  <Input 
                    id="stock"
                    required
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Minimal Stok <span className="text-destructive">*</span></Label>
                  <Input 
                    id="minimum_stock"
                    required
                    type="number"
                    min="0"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
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

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari produk..." className="pl-8 w-full" />
        </div>
        <Button variant="secondary">
          <Filter className="mr-2 h-4 w-4" /> Filter
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
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Tidak ada produk yang ditemukan. Tambahkan produk untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="py-3 px-4 font-medium">{product.sku}</TableCell>
                    <TableCell className="py-3 px-4">{product.name}</TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">{product.category?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-4">Rp {Number(product.selling_price).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={product.stock <= product.minimum_stock ? "text-destructive font-bold" : ""}>
                          {product.stock}
                        </span>
                        {product.stock <= product.minimum_stock && (
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
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(product)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
