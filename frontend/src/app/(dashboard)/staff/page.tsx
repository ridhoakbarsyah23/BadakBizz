"use client"

import { apiUrl } from "@/lib/api"
import React, { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog"
import { AlertTriangle, CheckCircle2, Loader2, Plus, Edit2, ShieldAlert, ShieldCheck, Search } from "lucide-react"

interface Role {
  id: number
  name: string
  slug: string
}

interface Staff {
  id: number
  name: string
  email: string
  is_active: boolean
  role_id: number
  role: Role
}

export default function StaffPage() {
  const { token, user } = useAuth()
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "",
    is_active: true
  })
  const [notice, setNotice] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [isNoticeVisible, setIsNoticeVisible] = useState(false)

  useEffect(() => {
    if (!notice) return

    setIsNoticeVisible(true)

    const hideTimerId = window.setTimeout(() => {
      setIsNoticeVisible(false)
    }, 15000)
    const removeTimerId = window.setTimeout(() => {
      setNotice(null)
    }, 15300)

    return () => {
      window.clearTimeout(hideTimerId)
      window.clearTimeout(removeTimerId)
    }
  }, [notice])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const headers = { "Authorization": `Bearer ${token}` }
      const [staffRes, rolesRes] = await Promise.all([
        fetch(apiUrl(`/api/staff?page=${currentPage}&per_page=10`), { headers }),
        fetch(apiUrl('/api/roles'), { headers })
      ])
      
      const staffData = await staffRes.json()
      const rolesData = await rolesRes.json()

      if (staffData && staffData.data) {
        setStaffList(staffData.data)
        setTotalPages(staffData.last_page || 1)
      } else {
        setStaffList(Array.isArray(staffData) ? staffData : [])
        setTotalPages(1)
      }
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, currentPage])

  const openDialog = (staff?: Staff) => {
    setNotice(null)
    if (staff) {
      setEditingStaff(staff)
      setFormData({
        name: staff.name,
        email: staff.email,
        password: "", // leave empty unless changing
        role_id: staff.role_id.toString(),
        is_active: staff.is_active
      })
    } else {
      setEditingStaff(null)
      setFormData({
        name: "",
        email: "",
        password: "",
        role_id: roles.length > 0 ? roles.find(r => r.slug === 'cashier')?.id.toString() || "" : "",
        is_active: true
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const actionLabel = editingStaff ? "diperbarui" : "ditambahkan"
      const url = editingStaff 
        ? apiUrl(`/api/staff/${editingStaff.id}`)
        : apiUrl('/api/staff')
      
      const method = editingStaff ? "PUT" : "POST"
      
      const payload: any = {
        name: formData.name,
        email: formData.email,
        role_id: Number(formData.role_id),
        is_active: formData.is_active
      }

      if (formData.password) {
        payload.password = formData.password
      }

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        await fetchData()
        setIsDialogOpen(false)
        setNotice({
          type: "success",
          message: `Data karyawan ${formData.name} berhasil ${actionLabel}.`,
        })
      } else {
        const error = await res.json()
        setNotice({
          type: "error",
          message: error.message || JSON.stringify(error.errors) || "Gagal menyimpan data karyawan.",
        })
      }
    } catch (error) {
      console.error("Save error:", error)
      setNotice({
        type: "error",
        message: "Terjadi gangguan jaringan saat menyimpan data karyawan.",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const filteredStaff = staffList.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manajemen Karyawan</h1>
          <p className="text-muted-foreground">
            Kelola akun Admin dan Kasir. Anda dapat me-nonaktifkan akun karyawan yang sudah resign.
          </p>
        </div>
        <Button onClick={() => openDialog()} className="shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Tambah Staf
        </Button>
      </div>

      {notice && (
        <div
          className={
            notice.type === "success"
              ? `flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 transition-all duration-300 ease-out ${isNoticeVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`
              : `flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 transition-all duration-300 ease-out ${isNoticeVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`
          }
        >
          {notice.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{notice.message}</span>
        </div>
      )}

      <Card>
        <CardHeader className="py-4 px-6 border-b bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <CardTitle className="text-lg">Daftar Karyawan</CardTitle>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari nama atau email..."
              className="pl-8 h-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table className="w-full min-w-[700px]">
                <TableHeader>
                  <TableRow className="bg-slate-50/50">
                    <TableHead className="py-4">NAMA KARYAWAN</TableHead>
                    <TableHead>EMAIL</TableHead>
                    <TableHead>ROLE (HAK AKSES)</TableHead>
                    <TableHead>STATUS</TableHead>
                    <TableHead className="text-right">AKSI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Belum ada data staf.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStaff.map((staff) => (
                      <TableRow key={staff.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-semibold text-default-900">
                          {staff.name}
                          {user?.id === staff.id && (
                            <Badge variant="outline" className="ml-2 text-[10px] py-0 border-primary text-primary">Anda</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{staff.email}</TableCell>
                        <TableCell>
                          {staff.role?.slug === 'admin' ? (
                            <div className="flex items-center gap-1.5 text-purple-700 font-medium">
                              <ShieldCheck className="w-4 h-4" /> Admin
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-blue-700 font-medium">
                              <ShieldAlert className="w-4 h-4 text-blue-500" /> Kasir
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {staff.is_active ? (
                            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">Aktif</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-slate-200">Non-Aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDialog(staff)}>
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          {!isLoading && totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Sebelumnya
              </Button>
              <span className="text-sm text-slate-500 font-medium">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Selanjutnya
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Edit Data Staf" : "Tambah Staf Baru"}</DialogTitle>
            <DialogDescription>
              Isi data kredensial pegawai untuk akses login ke sistem.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nama Lengkap</label>
              <Input 
                placeholder="Misal: Budi Santoso"
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email (Untuk Login)</label>
              <Input 
                type="email"
                placeholder="budi@example.com"
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password {editingStaff && "(Kosongkan jika tidak ingin diubah)"}</label>
              <Input 
                type="password"
                placeholder="Minimal 6 karakter"
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Hak Akses (Role)</label>
              <select 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.role_id}
                onChange={(e) => setFormData({...formData, role_id: e.target.value})}
              >
                <option value="" disabled>Pilih Role</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id.toString()}>{r.name} ({r.slug})</option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2 mt-2">
              <input 
                type="checkbox" 
                id="isActive"
                className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                checked={formData.is_active}
                onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                disabled={editingStaff?.id === user?.id} // Cannot deactivate oneself easily
              />
              <label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Akun Aktif (Dapat Login)
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={isSaving || !formData.name || !formData.email || !formData.role_id || (!editingStaff && !formData.password)}>
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {editingStaff ? "Simpan Perubahan" : "Buat Akun"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
