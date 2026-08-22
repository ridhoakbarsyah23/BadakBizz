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
        const res = await fetch("http://localhost:8000/api/settings", {
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
      const res = await fetch("http://localhost:8000/api/settings", {
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
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your store preferences, receipt formats, and staff access.
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
              <CardTitle>Staff & Users</CardTitle>
            </div>
            <CardDescription>
              Add cashiers, reset passwords, and revoke access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Control who can access your POS system. Each cashier will have their name printed on the receipt for accountability.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/staff" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">Manage Staff Accounts</Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* General Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-primary" />
              <CardTitle>General Information</CardTitle>
            </div>
            <CardDescription>
              Update your store name and contact details.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="storeName">Store Name</Label>
              <Input 
                id="storeName" 
                value={settings.name} 
                onChange={(e) => setSettings({...settings, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                value={settings.phone} 
                onChange={(e) => setSettings({...settings, phone: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Store Address</Label>
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
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* Financial Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-primary" />
              <CardTitle>Financial & Tax</CardTitle>
            </div>
            <CardDescription>
              Set up your currency and standard tax rates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value="IDR (Rp)" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Default Tax (%)</Label>
                <Input 
                  id="tax" 
                  type="number" 
                  value={settings.tax_rate} 
                  onChange={(e) => setSettings({...settings, tax_rate: e.target.value})} 
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceCharge">Service Charge (%)</Label>
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
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        {/* Receipt Customization */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-primary" />
              <CardTitle>Receipt Customization</CardTitle>
            </div>
            <CardDescription>
              Customize the text printed on the header and footer of your receipts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="receiptHeader">Receipt Header</Label>
                <Input 
                  id="receiptHeader" 
                  value={settings.receipt_header} 
                  onChange={(e) => setSettings({...settings, receipt_header: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">Appears at the very top of the printed receipt.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Receipt Footer / Thank You Message</Label>
                <Input 
                  id="receiptFooter" 
                  value={settings.receipt_footer} 
                  onChange={(e) => setSettings({...settings, receipt_footer: e.target.value})} 
                />
                <p className="text-xs text-muted-foreground">Appears at the very bottom.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}
