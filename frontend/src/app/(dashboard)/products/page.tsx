"use client"

import React, { useState, useEffect } from "react"
import { 
  Button, 
} from "@/components/ui/button"
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
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, Search, Filter } from "lucide-react"

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
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("http://localhost:8000/api/products"),
        fetch("http://localhost:8000/api/categories")
      ])
      
      const prodData = await prodRes.json()
      const catData = await catRes.json()
      
      setProducts(Array.isArray(prodData) ? prodData : [])
      setCategories(Array.isArray(catData) ? catData : [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const url = editingId 
        ? `http://localhost:8000/api/products/${editingId}`
        : "http://localhost:8000/api/products"
        
      const payload = {
        ...formData,
        category_id: formData.category_id || null,
      }
        
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Failed to save product")
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
      const res = await fetch(`http://localhost:8000/api/products/${deleteProduct.id}`, {
        method: "DELETE"
      })
      if (!res.ok) throw new Error("Failed to delete product")
      
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
    setFormData(initialForm)
    setError("")
    setIsFormOpen(true)
  }

  const openDelete = (product: Product) => {
    setDeleteProduct(product)
    setIsDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Products</h1>
          <p className="text-muted-foreground">
            Manage your inventory and product details.
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger render={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          } />
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Product" : "Add New Product"}</DialogTitle>
              <DialogDescription>Fill in the product details below.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU <span className="text-destructive">*</span></Label>
                  <Input 
                    id="sku"
                    required
                    placeholder="PROD-001"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name <span className="text-destructive">*</span></Label>
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
                <Label htmlFor="category">Category</Label>
                <select 
                  id="category"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id.toString()}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_price">Purchase Price (Rp) <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="selling_price">Selling Price (Rp) <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="stock">Current Stock <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="minimum_stock">Minimum Stock <span className="text-destructive">*</span></Label>
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
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products..." className="pl-8 w-full" />
        </div>
        <Button variant="secondary">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>PRODUCT NAME</TableHead>
                <TableHead>CATEGORY</TableHead>
                <TableHead>PRICE</TableHead>
                <TableHead>STOCK</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No products found. Add a product to get started.
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
                          <Badge variant="destructive" className="h-5 px-1 text-[10px]">Low</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge variant={product.is_active ? "secondary" : "outline"} className={product.is_active ? "bg-green-100 text-green-700 hover:bg-green-100" : ""}>
                        {product.is_active ? "Active" : "Inactive"}
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

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <DialogTitle>Delete Product</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Are you sure you want to delete the product <strong>{deleteProduct?.name}</strong>? 
              <br />This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
