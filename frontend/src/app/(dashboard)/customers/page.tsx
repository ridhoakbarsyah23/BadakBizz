"use client"

import { apiUrl } from "@/lib/api"
import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
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
import { Plus, Edit2, Trash2, Loader2, AlertTriangle, Search } from "lucide-react"

interface Customer {
  id: number
  name: string
  phone: string | null
  email: string | null
  total_transactions: number
  total_spending: string | number
}

export default function CustomersPage() {
  const { token } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, action: null as any, title: "", desc: "" })

  // Fetch data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch(apiUrl(`/api/customers?page=${currentPage}&per_page=10`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (!res.ok) throw new Error('Failed to fetch data')
      const data = await res.json()
      if (data && data.data) {
        setCustomers(data.data)
        setTotalPages(data.last_page || 1)
      } else {
        setCustomers(Array.isArray(data) ? data : [])
        setTotalPages(1)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, currentPage])

  // Filtered data
  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchQuery.toLowerCase()
    return customer.name.toLowerCase().includes(searchLower) || 
           (customer.phone && customer.phone.includes(searchLower)) ||
           (customer.email && customer.email.toLowerCase().includes(searchLower))
  })

  // Handlers
  const openCreateModal = () => {
    setModalMode("create")
    setFormData({ name: "", phone: "", email: "" })
    setSelectedCustomer(null)
    setIsModalOpen(true)
  }

  const openEditModal = (customer: Customer) => {
    setModalMode("edit")
    setFormData({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
    })
    setSelectedCustomer(customer)
    setIsModalOpen(true)
  }

  const openDeleteModal = (customer: Customer) => {
    setSelectedCustomer(customer)
    setIsDeleteModalOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmConfig({
      isOpen: true,
      title: "Simpan Perubahan",
      desc: `Apakah Anda yakin ingin ${modalMode === 'create' ? 'menambahkan' : 'memperbarui'} pelanggan ini?`,
      action: executeSubmit
    })
  }

  const executeSubmit = async () => {
    try {
      setIsSubmitting(true)
      const url = modalMode === 'create' 
        ? apiUrl('/api/customers')
        : apiUrl(`/api/customers/${selectedCustomer?.id}`)
      
      const method = modalMode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error('Gagal menyimpan pelanggan')

      await fetchData()
      setIsModalOpen(false)
    } catch (error) {
      console.error('Error saving customer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedCustomer) return
    
    try {
      setIsSubmitting(true)
      const res = await fetch(apiUrl(`/api/customers/${selectedCustomer.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!res.ok) throw new Error('Gagal menghapus pelanggan')

      await fetchData()
      setIsDeleteModalOpen(false)
    } catch (error) {
      console.error('Error deleting customer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Pelanggan</h1>
          <p className="text-muted-foreground">
            Kelola basis data pelanggan dan riwayat transaksi mereka.
          </p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger render={
            <Button onClick={openCreateModal}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Pelanggan
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {modalMode === 'create' ? 'Tambah Pelanggan Baru' : 'Edit Pelanggan'}
              </DialogTitle>
              <DialogDescription>
                Lengkapi detail kontak pelanggan di bawah ini.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nama <span className="text-destructive">*</span></Label>
                  <Input 
                    id="name"
                    required
                    placeholder="Masukkan nama pelanggan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Nomor Telepon</Label>
                  <Input 
                    id="phone"
                    placeholder="e.g. 08123456789"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email"
                    type="email"
                    placeholder="customer@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button 
                  type="submit" 
                  disabled={!formData.name || isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {modalMode === 'create' ? 'Simpan Pelanggan' : 'Perbarui Pelanggan'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari pelanggan..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-background rounded-xl border shadow-sm overflow-x-auto w-full">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="min-w-[800px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>NAMA</TableHead>
                <TableHead>TELEPON</TableHead>
                <TableHead>EMAIL</TableHead>
                <TableHead>TOTAL TRANSAKSI</TableHead>
                <TableHead>TOTAL PEMBELANJAAN</TableHead>
                <TableHead className="text-right">AKSI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "Tidak ada pelanggan yang cocok dengan pencarian" : "Tidak ada pelanggan yang ditemukan. Tambahkan pelanggan pertama Anda!"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="py-3 px-4 font-medium">{customer.name}</TableCell>
                    <TableCell className="py-3 px-4">{customer.phone || '-'}</TableCell>
                    <TableCell className="py-3 px-4">{customer.email || '-'}</TableCell>
                    <TableCell className="py-3 px-4">{customer.total_transactions}</TableCell>
                    <TableCell className="py-3 px-4">Rp {Number(customer.total_spending).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => openEditModal(customer)}
                        >
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => openDeleteModal(customer)}
                        >
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

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="w-6 h-6" />
              <DialogTitle>Hapus Pelanggan</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Apakah Anda yakin ingin menghapus <strong>{selectedCustomer?.name}</strong>?
              <br />Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
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
