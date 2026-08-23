"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Store, Receipt, Coins, Loader2 } from "lucide-react"

import Link from "next/link"

export default function SettingsPage() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState({
    name: "",
    phone: "",
    address: "",
    tax_rate: "11",
    service_charge_rate: "0",
    receipt_header: "",
    receipt_footer: "",
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/settings", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (res.ok) {
          setSettings({
            name: data.name || "",
            phone: data.phone || "",
            address: data.address || "",
            tax_rate: data.tax_rate?.toString() || "11",
            service_charge_rate: data.service_charge_rate?.toString() || "0",
            receipt_header: data.receipt_header || "",
            receipt_footer: data.receipt_footer || "",
          })
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    if (token) fetchSettings()
  }, [token])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch("http://127.0.0.1:8000/api/settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      })

      if (res.ok) {
        alert("Pengaturan berhasil disimpan!")
      } else {
        const err = await res.json()
        alert("Gagal menyimpan: " + (err.message || "Unknown error"))
      }
    } catch (error) {
      console.error("Save error:", error)
      alert("Terjadi kesalahan jaringan.")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Pengaturan Toko</h1>
        <p className="text-muted-foreground">
          Kelola preferensi toko, format struk, dan akses karyawan.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        
        {/* Staff Management */}
        <Card className="border-primary/20 shadow-md shadow-primary/5 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Store className="w-5 h-5 text-primary" />
              </div>
              <CardTitle>Karyawan & Pengguna</CardTitle>
            </div>
            <CardDescription>
              Tambahkan kasir, atur ulang kata sandi, dan cabut akses.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Kontrol siapa yang dapat mengakses sistem POS Anda. Setiap nama kasir akan tercetak di struk untuk akuntabilitas.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/staff" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Kelola Akun Karyawan</Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* General Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <CardTitle>Informasi Umum</CardTitle>
            </div>
            <CardDescription>
              Perbarui nama toko dan detail kontak Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Nama Toko</Label>
              <Input 
                id="storeName" 
                value={settings.name} 
                onChange={(e) => setSettings({...settings, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Nomor Telepon</Label>
              <Input 
                id="phone" 
                value={settings.phone} 
                onChange={(e) => setSettings({...settings, phone: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Alamat Toko</Label>
              <Input 
                id="address" 
                value={settings.address} 
                onChange={(e) => setSettings({...settings, address: e.target.value})} 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </CardFooter>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <CardTitle>Keuangan & Pajak</CardTitle>
            </div>
            <CardDescription>
              Atur mata uang dan tarif pajak standar Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Mata Uang</Label>
                <Input id="currency" value="IDR (Rp)" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Pajak Default (%)</Label>
                <Input 
                  id="tax" 
                  type="number" 
                  value={settings.tax_rate} 
                  onChange={(e) => setSettings({...settings, tax_rate: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceCharge">Biaya Layanan (Service Charge) (%)</Label>
              <Input 
                id="serviceCharge" 
                type="number" 
                value={settings.service_charge_rate} 
                onChange={(e) => setSettings({...settings, service_charge_rate: e.target.value})} 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </CardFooter>
        </Card>

        {/* Receipt Customization */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle>Kustomisasi Struk</CardTitle>
            </div>
            <CardDescription>
              Sesuaikan teks yang dicetak di bagian atas dan bawah struk Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="receiptHeader">Header Struk</Label>
                <Input 
                  id="receiptHeader" 
                  value={settings.receipt_header} 
                  onChange={(e) => setSettings({...settings, receipt_header: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">Muncul di bagian paling atas struk yang dicetak.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Footer Struk / Pesan Terima Kasih</Label>
                <Input 
                  id="receiptFooter" 
                  value={settings.receipt_footer} 
                  onChange={(e) => setSettings({...settings, receipt_footer: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">Muncul di bagian paling bawah.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Perubahan
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}
