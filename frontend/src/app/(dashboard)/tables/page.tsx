"use client"

import { apiUrl } from "@/lib/api"
import { useEffect, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AlertTriangle, Armchair, CheckCircle2, Edit2, Loader2, Plus, Trash2 } from "lucide-react"

type DiningTable = {
  id: number
  name: string
  status: "available" | "occupied" | "reserved"
}

const statusLabels: Record<DiningTable["status"], string> = {
  available: "Tersedia",
  occupied: "Terpakai",
  reserved: "Reservasi",
}

const statusBadgeClass: Record<DiningTable["status"], string> = {
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  occupied: "bg-rose-50 text-rose-700 border-rose-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-200",
}

export default function TablesPage() {
  const { token, hasRole } = useAuth()
  const [tables, setTables] = useState<DiningTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null)
  const [deleteTable, setDeleteTable] = useState<DiningTable | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    status: "available" as DiningTable["status"],
  })
  const [error, setError] = useState("")
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

  const fetchTables = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl("/api/tables"), {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      setTables(Array.isArray(data) ? data : [])
    } catch {
      setTables([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchTables()
    }
  }, [token])

  const openCreate = () => {
    setNotice(null)
    setEditingTable(null)
    setFormData({ name: "", status: "available" })
    setError("")
    setIsFormOpen(true)
  }

  const openEdit = (table: DiningTable) => {
    setNotice(null)
    setEditingTable(table)
    setFormData({ name: table.name, status: table.status })
    setError("")
    setIsFormOpen(true)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")
    const actionLabel = editingTable ? "diperbarui" : "ditambahkan"

    try {
      const res = await fetch(
        editingTable ? apiUrl(`/api/tables/${editingTable.id}`) : apiUrl("/api/tables"),
        {
          method: editingTable ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      )
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || "Gagal menyimpan meja")
      }

      await fetchTables()
      setIsFormOpen(false)
      setNotice({
        type: "success",
        message: `Meja ${formData.name} berhasil ${actionLabel}.`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan meja")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTable) return

    setIsSubmitting(true)
    const tableName = deleteTable.name
    try {
      const res = await fetch(apiUrl(`/api/tables/${deleteTable.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.message || "Gagal menghapus meja")
      }

      await fetchTables()
      setDeleteTable(null)
      setNotice({
        type: "success",
        message: `Meja ${tableName} berhasil dihapus.`,
      })
    } catch (err) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menghapus meja",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!hasRole("admin")) {
    return <div className="p-10 text-center font-bold text-red-500">Access Denied. Admins only.</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Manajemen Meja</h1>
          <p className="text-muted-foreground">
            Atur daftar meja dine-in yang muncul di layar kasir.
          </p>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger render={
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Meja
            </Button>
          } />
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTable ? "Edit Meja" : "Tambah Meja"}</DialogTitle>
              <DialogDescription>
                Meja tersedia bisa dipilih kasir saat checkout dine-in.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="tableName">Nama Meja</Label>
                <Input
                  id="tableName"
                  required
                  placeholder="cth. Meja 1"
                  value={formData.name}
                  onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, status: value as DiningTable["status"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Tersedia</SelectItem>
                    <SelectItem value="reserved">Reservasi</SelectItem>
                    <SelectItem value="occupied">Terpakai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Simpan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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

      <div className="grid gap-3 sm:grid-cols-3">
        {(["available", "occupied", "reserved"] as DiningTable["status"][]).map((status) => (
          <div key={status} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <Armchair className="h-4 w-4" />
              {statusLabels[status]}
            </div>
            <div className="mt-2 text-3xl font-black text-slate-900">
              {tables.filter((table) => table.status === status).length}
            </div>
          </div>
        ))}
      </div>

      <div className="w-full overflow-x-auto rounded-lg border bg-background shadow-sm">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="min-w-[720px]">
            <TableHeader>
              <TableRow>
                <TableHead>Nama Meja</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    Belum ada meja. Tambahkan meja untuk mengaktifkan pilihan dine-in di POS.
                  </TableCell>
                </TableRow>
              ) : (
                tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-semibold">{table.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass[table.status]}>
                        {statusLabels[table.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(table)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={table.status === "occupied"}
                          onClick={() => setDeleteTable(table)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      <Dialog open={Boolean(deleteTable)} onOpenChange={(open) => !open && setDeleteTable(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-destructive">
              <AlertTriangle className="h-6 w-6" />
              <DialogTitle>Hapus Meja</DialogTitle>
            </div>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus <strong>{deleteTable?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTable(null)}>
              Batal
            </Button>
            <Button variant="destructive" disabled={isSubmitting} onClick={handleDelete}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
