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
import { Store, Receipt, Coins } from "lucide-react"

import Link from "next/link"

export default function SettingsPage() {
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
            <p className="text-sm text-slate-600 mb-4">
              Control who can access your POS system. Each cashier will have their name printed on the receipt for accountability.
            </p>
            <Link href="/settings/staff">
              <Button className="w-full">Manage Staff Accounts</Button>
            </Link>
          </CardContent>
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
              <Input id="storeName" defaultValue="Kivo Coffee & Eatery" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" defaultValue="081234567890" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Store Address</Label>
              <Input id="address" defaultValue="Jl. Sudirman No. 42, Jakarta" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save Changes</Button>
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
                <Input id="currency" defaultValue="IDR (Rp)" disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tax">Default Tax (%)</Label>
                <Input id="tax" type="number" defaultValue="11" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="serviceCharge">Service Charge (%)</Label>
              <Input id="serviceCharge" type="number" defaultValue="5" />
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save Changes</Button>
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
                <Input id="receiptHeader" defaultValue="Kivo Coffee & Eatery" />
                <p className="text-xs text-muted-foreground">Appears at the very top of the printed receipt.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptFooter">Receipt Footer / Thank You Message</Label>
                <Input id="receiptFooter" defaultValue="Terima kasih atas kunjungan Anda!" />
                <p className="text-xs text-muted-foreground">Appears at the very bottom.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  )
}
