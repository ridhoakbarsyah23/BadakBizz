"use client"

import { apiUrl } from "@/lib/api"
import { useState, useEffect } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, UserCog, Eye, EyeOff } from "lucide-react"

export default function StaffManagementPage() {
  const { token, hasRole } = useAuth()
  const [staff, setStaff] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  // Form states
  const [isOpen, setIsOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [currentId, setCurrentId] = useState<number | null>(null)
  
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState("cashier") // Default to Cashier
  const [isActive, setIsActive] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, action: null as any, title: "", desc: "" })
  const [showPassword, setShowPassword] = useState(false)

  const fetchStaff = async () => {
    setIsLoading(true)
    try {
      const res = await fetch(apiUrl('/api/staff'), {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      const data = await res.json()
      setStaff(data)
    } catch (error) {
      console.error("Failed to fetch staff:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchStaff()
    }
  }, [token])

  if (!hasRole('admin')) {
    return <div className="p-10 text-center text-red-500 font-bold">Access Denied. Admins only.</div>
  }

  const handleOpenNew = () => {
    setIsEditMode(false)
    setCurrentId(null)
    setName("")
    setEmail("")
    setPassword("")
    setRole("cashier")
    setIsActive(true)
    setShowPassword(false)
    setIsOpen(true)
  }

  const handleOpenEdit = (user: any) => {
    setIsEditMode(true)
    setCurrentId(user.id)
    setName(user.name)
    setEmail(user.email)
    setPassword("") // empty password means no change
    setRole(user.role?.slug || "cashier")
    setIsActive(user.is_active === 1 || user.is_active === true)
    setShowPassword(false)
    setIsOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setConfirmConfig({
      isOpen: true,
      title: "Save Changes",
      desc: `Are you sure you want to ${isEditMode ? 'update' : 'add'} this staff member?`,
      action: executeSubmit
    })
  }

  const executeSubmit = async () => {
    setIsSubmitting(true)
    
    const url = isEditMode 
      ? apiUrl(`/api/staff/${currentId}`)
      : apiUrl('/api/staff')
      
    const method = isEditMode ? 'PUT' : 'POST'
    
    const payload: any = {
      name,
      email,
      is_active: isActive ? 1 : 0,
      role_id: role === "admin" ? 1 : 2, 
    }

    if (password) {
      payload.password = password
    }

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        setIsOpen(false)
        fetchStaff()
      } else {
        const errorData = await res.json()
        alert(errorData.message || 'Failed to save staff')
      }
    } catch {
      alert('Network error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = (user: any) => {
    const newStatus = user.is_active ? 0 : 1
    const actionText = user.is_active ? 'disable' : 'enable'
    
    setConfirmConfig({
      isOpen: true,
      title: "Confirm Status Change",
      desc: `Are you sure you want to ${actionText} ${user.name}'s account?`,
      action: async () => {
        try {
          await fetch(apiUrl(`/api/staff/${user.id}`), {
            method: 'PUT',
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ is_active: newStatus })
          })
          fetchStaff()
        } catch (error) {
          console.error(error)
        }
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-muted-foreground">
            Manage cashier accounts, reset passwords, and control system access.
          </p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={
            <Button onClick={handleOpenNew} className="rounded-xl shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Add New Staff
            </Button>
          } />
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Edit Staff' : 'Add New Staff'}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address (for Login)</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required={!isEditMode} 
                      className="pr-10"
                    />
                    <Button 
                      type="button"
                      variant="ghost" 
                      size="icon"
                      className="absolute right-0 top-0 h-full w-10 text-muted-foreground hover:text-foreground hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(val) => setRole(val || "cashier")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="cashier">Cashier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between mt-4 p-4 border rounded-xl bg-slate-50">
                  <div className="space-y-0.5">
                    <Label className="text-base">Account Active</Label>
                    <p className="text-sm text-muted-foreground">
                      If disabled, this user cannot log in to POS.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {isEditMode ? 'Save Changes' : 'Create Staff'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto w-full">
        <Table className="min-w-[600px]">
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : staff.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No staff members found.
                </TableCell>
              </TableRow>
            ) : (
              staff.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role?.slug === 'admin' ? 'default' : 'secondary'} className="capitalize">
                      {user.role?.name || 'Staff'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {user.role?.slug !== 'admin' && (
                      <>
                        <Button 
                          variant={user.is_active ? "destructive" : "default"} 
                          size="sm" 
                          onClick={() => handleToggleActive(user)}
                        >
                          {user.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEdit(user)}>
                          <UserCog className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      </>
                    )}
                    {user.role?.slug === 'admin' && (
                      <span className="text-xs text-muted-foreground italic mr-2">Admin account</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={confirmConfig.isOpen} onOpenChange={(open) => setConfirmConfig(prev => ({ ...prev, isOpen: open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmConfig.desc}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => {
              e.preventDefault();
              setConfirmConfig(prev => ({ ...prev, isOpen: false }));
              if (confirmConfig.action) {
                setTimeout(() => confirmConfig.action(), 100);
              }
            }}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
