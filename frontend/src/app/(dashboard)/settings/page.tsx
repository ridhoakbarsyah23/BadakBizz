"use client"

import { apiUrl } from "@/lib/api"
import { useState, useEffect, type CSSProperties } from "react"
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
import { Switch } from "@/components/ui/switch"
import { AlertTriangle, Armchair, CalendarClock, CheckCircle2, Coins, Loader2, Receipt, Settings2, Store, X } from "lucide-react"

import Link from "next/link"

export default function SettingsPage() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notice, setNotice] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)
  const [settings, setSettings] = useState({
    name: "",
    business_type: "retail",
    enable_table_management: false,
    enable_kitchen_receipts: false,
    enable_shift_management: true,
    phone: "",
    address: "",
    tax_rate: "11",
    service_charge_rate: "0",
    receipt_header: "",
    receipt_footer: "",
    receipt_width: "80",
  })

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(apiUrl('/api/settings'), {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (res.ok) {
          setSettings({
            name: data.name || "",
            business_type: data.business_type || "retail",
            enable_table_management: data.enable_table_management == 1 || data.enable_table_management === true,
            enable_kitchen_receipts: data.enable_kitchen_receipts == 1 || data.enable_kitchen_receipts === true,
            enable_shift_management: true,
            phone: data.phone || "",
            address: data.address || "",
            tax_rate: data.tax_rate?.toString() || "11",
            service_charge_rate: data.service_charge_rate?.toString() || "0",
            receipt_header: data.receipt_header || "",
            receipt_footer: data.receipt_footer || "",
            receipt_width: data.receipt_width?.toString() || "80",
          })
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error)
        setNotice({
          type: "error",
          message: "Gagal memuat pengaturan toko. Periksa koneksi backend lalu coba refresh.",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    if (token) fetchSettings()
  }, [token])

  const handleSave = async () => {
    setIsSaving(true)
    setNotice(null)
    try {
      const res = await fetch(apiUrl('/api/settings'), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          ...settings,
          enable_shift_management: true,
        })
      })
      const data = await res.json().catch(() => null)

      if (res.ok) {
        if (data?.store) {
          setSettings({
            name: data.store.name || "",
            business_type: data.store.business_type || "retail",
            enable_table_management: data.store.enable_table_management == 1 || data.store.enable_table_management === true,
            enable_kitchen_receipts: data.store.enable_kitchen_receipts == 1 || data.store.enable_kitchen_receipts === true,
            enable_shift_management: true,
            phone: data.store.phone || "",
            address: data.store.address || "",
            tax_rate: data.store.tax_rate?.toString() || "11",
            service_charge_rate: data.store.service_charge_rate?.toString() || "0",
            receipt_header: data.store.receipt_header || "",
            receipt_footer: data.store.receipt_footer || "",
            receipt_width: data.store.receipt_width?.toString() || "80",
          })
        }
        setNotice({
          type: "success",
          message: "Pengaturan berhasil disimpan.",
        })
      } else {
        setNotice({
          type: "error",
          message: data?.message || "Gagal menyimpan pengaturan.",
        })
      }
    } catch (error) {
      console.error("Save error:", error)
      setNotice({
        type: "error",
        message: "Terjadi kesalahan jaringan. Periksa backend lalu coba lagi.",
      })
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

      {notice && (
        <div className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-red-200 bg-red-50 text-red-700"
        }`}>
          <div className="flex items-start gap-2">
            {notice.type === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button
            type="button"
            className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
            aria-label="Tutup notifikasi"
            onClick={() => setNotice(null)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

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

        <Card className="border-emerald-200 bg-emerald-50/60 shadow-md shadow-emerald-900/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-emerald-100 p-2">
                <Armchair className="h-5 w-5 text-emerald-700" />
              </div>
              <CardTitle>Meja Dine-in</CardTitle>
            </div>
            <CardDescription>
              Tambah meja, ubah status reservasi, dan pantau meja yang sedang terpakai.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Daftar meja ini akan muncul di POS saat fitur Manajemen Meja diaktifkan.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/tables" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Kelola Meja</Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Business Type & Features */}
        <Card className="md:col-span-2 border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-primary" />
              <CardTitle>Tipe Bisnis & Fitur Khusus</CardTitle>
            </div>
            <CardDescription>
              Konfigurasikan jenis UMKM Anda untuk mengaktifkan fitur yang relevan.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessType">Kategori Bisnis Utama</Label>
              <select 
                id="businessType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={settings.business_type}
                onChange={(e) => setSettings({...settings, business_type: e.target.value})}
              >
                <option value="retail">Retail (Minimarket, Toko Kelontong, Butik)</option>
                <option value="fnb">Food & Beverage (Restoran, Kafe, Kopi)</option>
                <option value="services">Jasa (Salon, Bengkel, Cuci Sepatu)</option>
                <option value="mixed">Campuran / Lainnya</option>
              </select>
            </div>

            <div className="space-y-4 pt-2 border-t">
              <h4 className="font-medium text-sm text-muted-foreground mb-3">Fitur Tambahan</h4>
              
              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Manajemen Meja (Dine-in)</Label>
                  <p className="text-sm text-muted-foreground">
                    Aktifkan jika pelanggan Anda bisa makan di tempat dan Anda perlu mencatat pesanan berdasarkan meja.
                  </p>
                </div>
                <Switch 
                  checked={settings.enable_table_management}
                  onCheckedChange={(checked) => setSettings({...settings, enable_table_management: checked})}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Cetak Tiket Dapur (Kitchen Receipt)</Label>
                  <p className="text-sm text-muted-foreground">
                    Otomatis mencetak daftar pesanan untuk dapur tanpa menyertakan harga barang.
                  </p>
                </div>
                <Switch 
                  checked={settings.enable_kitchen_receipts}
                  onCheckedChange={(checked) => setSettings({...settings, enable_kitchen_receipts: checked})}
                />
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-blue-600">
                    <CalendarClock className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-base">Sistem Shift Kasir</Label>
                    <p className="text-sm text-muted-foreground">
                      Aktifkan jika kasir harus buka shift sebelum checkout dan tutup shift saat selesai bertugas.
                    </p>
                  </div>
                </div>
                <Switch checked={settings.enable_shift_management} disabled />
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Simpan Konfigurasi
            </Button>
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
          <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiptWidth">Lebar Kertas Printer (Thermal)</Label>
                <select
                  id="receiptWidth"
                  className="flex h-10 w-full md:w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={settings.receipt_width}
                  onChange={(e) => setSettings({...settings, receipt_width: e.target.value})}
                >
                  <option value="80">80mm (Standar)</option>
                  <option value="58">58mm (Kecil)</option>
                </select>
                <p className="text-xs text-muted-foreground">Pilih sesuai ukuran kertas printer struk yang Anda gunakan agar hasil cetakan proporsional.</p>
              </div>
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
            </div>
            <div className="flex justify-center rounded-lg border border-dashed bg-slate-50 p-4">
              <div
                style={{ "--receipt-width": `${Number(settings.receipt_width || 80)}mm` } as CSSProperties}
                className="w-[var(--receipt-width)] max-w-full bg-white p-4 font-mono text-[10px] text-black shadow-sm"
              >
                <div className="receipt-text text-center text-[13px] font-bold leading-tight">
                  {settings.receipt_header || settings.name || "BadakBizz Coffee & Eatery"}
                </div>
                <div className="receipt-text mt-2 text-center text-[9px] leading-snug">
                  {settings.address || "Alamat Toko"}<br />
                  Telp: {settings.phone || "-"}
                </div>
                <div className="my-3 border-b-2 border-dashed border-black" />
                <div className="receipt-row text-[9px]">
                  <span>29/08/2026, 10.15</span>
                  <span className="receipt-value receipt-text">TRX-20260829-001</span>
                </div>
                <div className="receipt-row mt-2 text-[9px]">
                  <span className="receipt-text">Kasir: Cashier Staff</span>
                  <span className="receipt-value receipt-text">Walk-in</span>
                </div>
                <div className="my-3 border-b-2 border-dashed border-black" />
                <div className="space-y-2">
                  <div>
                    <div className="receipt-row font-semibold">
                      <span className="receipt-text">Kopi Black Aren</span>
                      <span className="receipt-value receipt-money">Rp 19.000</span>
                    </div>
                    <div className="text-[9px]">1 x Rp 19.000</div>
                  </div>
                  <div>
                    <div className="receipt-row font-semibold">
                      <span className="receipt-text">Nasi Telor Orak Arik</span>
                      <span className="receipt-value receipt-money">Rp 12.000</span>
                    </div>
                    <div className="text-[9px]">1 x Rp 12.000</div>
                  </div>
                </div>
                <div className="my-3 border-b-2 border-dashed border-black" />
                <div className="receipt-row">
                  <span>Subtotal</span>
                  <span className="receipt-value receipt-money">Rp 31.000</span>
                </div>
                <div className="receipt-row">
                  <span>Pajak ({settings.tax_rate || 0}%)</span>
                  <span className="receipt-value receipt-money">Rp 3.410</span>
                </div>
                <div className="receipt-row mt-2 text-[13px] font-black">
                  <span>TOTAL</span>
                  <span className="receipt-value receipt-money">Rp 34.410</span>
                </div>
                <div className="my-3 border-b-2 border-dashed border-black" />
                <div className="receipt-text text-center text-[9px] italic">
                  {settings.receipt_footer || "Terima kasih atas kunjungan Anda!"}
                </div>
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
