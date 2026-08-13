"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  Banknote,
  QrCode
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Dummy Data
const DUMMY_PRODUCTS = [
  { id: "1", name: "Kopi Susu Aren", price: 18000, category: "Beverage", image: "☕" },
  { id: "2", name: "Americano", price: 15000, category: "Beverage", image: "☕" },
  { id: "3", name: "Roti Bakar Coklat", price: 20000, category: "Food", image: "🍞" },
  { id: "4", name: "Indomie Telur", price: 12000, category: "Food", image: "🍜" },
  { id: "5", name: "Es Teh Manis", price: 5000, category: "Beverage", image: "🍹" },
  { id: "6", name: "Kentang Goreng", price: 15000, category: "Snack", image: "🍟" },
]

export default function POSPage() {
  const [cart, setCart] = useState<any[]>([])
  const [search, setSearch] = useState("")

  const filteredProducts = DUMMY_PRODUCTS.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  )

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, qty: item.qty + 1 } 
            : item
        )
      }
      return [...prev, { ...product, qty: 1 }]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.qty + delta)
        return { ...item, qty: newQty }
      }
      return item
    }))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0)
  const tax = subtotal * 0.11 // 11% tax
  const total = subtotal + tax

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search products..." 
            className="pl-9 h-10 bg-white"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          <Badge variant="default" className="px-4 py-1 text-sm cursor-pointer">All</Badge>
          <Badge variant="outline" className="px-4 py-1 text-sm cursor-pointer">Beverage</Badge>
          <Badge variant="outline" className="px-4 py-1 text-sm cursor-pointer">Food</Badge>
          <Badge variant="outline" className="px-4 py-1 text-sm cursor-pointer">Snack</Badge>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
          {filteredProducts.map(product => (
            <Card 
              key={product.id} 
              className="cursor-pointer hover:border-primary transition-colors flex flex-col"
              onClick={() => addToCart(product)}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center flex-1 text-center gap-2">
                <div className="text-4xl mb-2">{product.image}</div>
                <div className="font-medium line-clamp-2 leading-tight">{product.name}</div>
                <div className="text-primary font-bold mt-auto">
                  Rp {product.price.toLocaleString("id-ID")}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="w-[380px] border rounded-lg flex flex-col bg-slate-50 dark:bg-slate-900/50">
        <div className="p-4 border-b bg-white dark:bg-slate-950 flex items-center gap-2 font-semibold">
          <ShoppingCart className="w-5 h-5" />
          Current Order
          <Badge variant="secondary" className="ml-auto rounded-full">
            {cart.reduce((sum, item) => sum + item.qty, 0)} items
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <ShoppingCart className="w-12 h-12 mb-4 opacity-20" />
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 items-center bg-white dark:bg-slate-950 p-3 rounded-md border shadow-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{item.name}</div>
                  <div className="text-sm text-primary font-semibold">
                    Rp {(item.price * item.qty).toLocaleString("id-ID")}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.id, -1)}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-4 text-center font-medium text-sm">{item.qty}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7 rounded-full" onClick={() => updateQty(item.id, 1)}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => removeFromCart(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t bg-white dark:bg-slate-950">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax (11%)</span>
              <span>Rp {tax.toLocaleString("id-ID")}</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <Dialog>
            <DialogTrigger render={
              <Button className="w-full h-12 text-lg font-bold" disabled={cart.length === 0}>
                Pay Rp {total.toLocaleString("id-ID")}
              </Button>
            } />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Checkout</DialogTitle>
                <DialogDescription>
                  Select a payment method to complete the transaction.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <Dialog>
                  <DialogTrigger render={
                    <Button variant="outline" className="h-24 flex flex-col gap-2">
                      <Banknote className="h-8 w-8 text-green-500" />
                      <span>Cash</span>
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Cash Payment</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total:</span>
                        <span>Rp {total.toLocaleString("id-ID")}</span>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Cash Received</label>
                        <Input type="number" placeholder="Enter amount" defaultValue={total} className="text-lg font-bold h-12" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button className="w-full h-12 text-lg" onClick={() => {
                        alert("Transaction Success! Showing receipt...")
                        setCart([])
                      }}>
                        Complete Transaction
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger render={
                    <Button variant="outline" className="h-24 flex flex-col gap-2">
                      <QrCode className="h-8 w-8 text-blue-500" />
                      <span>QRIS</span>
                    </Button>
                  } />
                  <DialogContent className="sm:max-w-sm text-center">
                    <DialogHeader>
                      <DialogTitle className="text-center">QRIS Payment</DialogTitle>
                    </DialogHeader>
                    <div className="py-6 flex flex-col items-center justify-center gap-4">
                      <div className="w-48 h-48 bg-slate-100 flex items-center justify-center border-2 border-dashed rounded-lg">
                        <QrCode className="w-32 h-32 text-slate-300" />
                      </div>
                      <p className="text-sm text-muted-foreground">Scan this QR code with any e-wallet or banking app.</p>
                      <div className="text-2xl font-bold text-primary">Rp {total.toLocaleString("id-ID")}</div>
                    </div>
                    <DialogFooter>
                      <Button className="w-full" onClick={() => {
                        alert("Payment Received! Showing receipt...")
                        setCart([])
                      }}>
                        Verify Payment
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
    </div>
  )
}
