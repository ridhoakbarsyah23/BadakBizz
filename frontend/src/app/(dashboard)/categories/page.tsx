"use client"

import { apiUrl } from "@/lib/api"
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
import { Plus, Edit2, Trash2, Loader2, AlertTriangle } from "lucide-react"

interface Category {
  id: number
  name: string
  slug: string
  created_at: string
}

export default function CategoriesPage() {
  const { token } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  // Dialog State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  
  // Form State
  const [formData, setFormData] = useState({ name: "" })
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, action: null as any, title: "", desc: "" })
  const [deleteCategory, setDeleteCategory] = useState<Category | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (token) {
      fetchCategories()
    }
  }, [token, currentPage])

  const fetchCategories = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl(`/api/categories?page=${currentPage}&per_page=10`), {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (data && data.data) {
        setCategories(data.data)
        setTotalPages(data.last_page || 1)
      } else {
        setCategories(Array.isArray(data) ? data : [])
        setTotalPages(1)
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmConfig({
      isOpen: true,
      title: "Simpan Perubahan",
      desc: `Apakah Anda yakin ingin ${editingId ? 'memperbarui' : 'menambahkan'} kategori ini?`,
      action: executeSubmit
    })
  }

  const executeSubmit = async () => {
    setIsSubmitting(true)
    setError("")

    try {
      const url = editingId 
        ? apiUrl(`/api/categories/${editingId}`)
        : apiUrl('/api/categories')
        
      const res = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan kategori")
      }

      await fetchCategories()
      setIsFormOpen(false)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteCategory) return
    setIsSubmitting(true)
    try {
      const res = await fetch(apiUrl(`/api/categories/${deleteCategory.id}`), {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      if (!res.ok) throw new Error("Gagal menghapus kategori")
      
      await fetchCategories()
      setIsDeleteOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
      setDeleteCategory(null)
    }
  }

  const openEdit = (category: Category) => {
    setEditingId(category.id)
    setFormData({ name: category.name })
    setIsFormOpen(true)
  }

  const openCreate = () => {
    setEditingId(null)
    setFormData({ name: "" })
    setError("")
    setIsFormOpen(true)
  }

  const openDelete = (category: Category) => {
    setDeleteCategory(category)
    setIsDeleteOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kategori</h1>
          <p className="text-muted-foreground">
            Kelola kategori produk Anda.
          </p>
        </div>
        
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger render={
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Kategori" : "Tambah Kategori Baru"}</DialogTitle>
              <DialogDescription>
                Masukkan nama kategori di bawah ini.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4 py-2">
                {error && <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md">{error}</div>}
                <div className="space-y-2">
                  <Label htmlFor="name">Nama Kategori <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name"
                    required
                    placeholder="cth., Minuman"
                    value={formData.name}
                    onChange={(e) => setFormData({ name: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
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

      <div className="bg-background rounded-lg border shadow-sm overflow-x-auto w-full">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>NAMA</TableHead>
                <TableHead>SLUG</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Tidak ada kategori yang ditemukan. Tambahkan kategori untuk memulai.
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="py-3 px-4">{category.id}</TableCell>
                    <TableCell className="py-3 px-4 font-medium">{category.name}</TableCell>
                    <TableCell className="py-3 px-4 text-muted-foreground">{category.slug}</TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(category)}>
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDelete(category)}>
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
              <DialogTitle>Hapus Kategori</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus kategori <strong>{deleteCategory?.name}</strong>?
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
