"use client"

import { useState, useEffect } from "react"
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
  Banknote,
  QrCode,
  Loader2
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

export default function POSPage() {
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [cashAmount, setCashAmount] = useState("")
  
  // Dialog open states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCashOpen, setIsCashOpen] = useState(false)
  const [isQrisOpen, setIsQrisOpen] = useState(false)

  const fetchProducts = async () => {
    setIsLoading(true)
    try {
      const res = await fetch("http://localhost:8000/api/products")
      const data = await res.json()
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to fetch products:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    p.is_active && 
    p.stock > 0 &&
    (activeCategory === "All" || p.category?.name === activeCategory)
  )

  const categories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean))) as string[]

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        if (existing.qty >= product.stock) {
          alert(`Stock for ${product.name} is only ${product.stock}`)
          return prev
        }
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
        const product = products.find(p => p.id === id)
        const newQty = Math.max(1, Math.min(item.qty + delta, product?.stock || 999))
        return { ...item, qty: newQty }
      }
      return item
    }))
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.qty), 0)
  const tax = subtotal * 0.11 // 11% tax
  const total = subtotal + tax

  const handleCheckout = async (paymentMethod: string, paymentAmount: number) => {
    try {
      const res = await fetch("http://localhost:8000/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.qty
          })),
          payment_method: paymentMethod,
          payment_amount: paymentAmount
        })
      })

      const data = await res.json()
      if (res.ok) {
        alert("Transaction Success! \nTrx No: " + data.data.transaction_number)
        setCart([])
        setIsCashOpen(false)
        setIsQrisOpen(false)
        setIsCheckoutOpen(false)
        fetchProducts() // refresh stock
      } else {
        alert("Error: " + (data.message || "Failed"))
      }
    } catch (error) {
      alert("Network error, please try again.")
    }
  }

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
          <Badge 
            variant={activeCategory === "All" ? "default" : "outline"} 
            className="px-4 py-1 text-sm cursor-pointer transition-colors"
            onClick={() => setActiveCategory("All")}
          >
            All
          </Badge>
          {categories.map(cat => (
            <Badge 
              key={cat}
              variant={activeCategory === cat ? "default" : "outline"} 
              className="px-4 py-1 text-sm cursor-pointer transition-colors"
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto pr-2 pb-4">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-10 text-muted-foreground">
              No active products with stock found.
            </div>
          ) : (
            filteredProducts.map(product => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-primary transition-colors flex flex-col"
                onClick={() => addToCart(product)}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center flex-1 text-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl mb-2">
                    {product.name.charAt(0)}
                  </div>
                  <div className="font-medium line-clamp-2 leading-tight">{product.name}</div>
                  <div className="text-xs text-muted-foreground">Stock: {product.stock}</div>
                  <div className="text-primary font-bold mt-auto">
                    Rp {Number(product.selling_price).toLocaleString("id-ID")}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
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
                    Rp {(item.selling_price * item.qty).toLocaleString("id-ID")}
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

          <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogTrigger render={<Button className="w-full h-12 text-lg font-bold" disabled={cart.length === 0} />}>
              Pay Rp {total.toLocaleString("id-ID")}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Checkout</DialogTitle>
                <DialogDescription>
                  Select a payment method to complete the transaction.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <Dialog open={isCashOpen} onOpenChange={setIsCashOpen}>
                  <DialogTrigger render={<Button variant="outline" className="h-24 flex flex-col gap-2" />}>
                    <Banknote className="h-8 w-8 text-green-500" />
                    <span>Cash</span>
                  </DialogTrigger>
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
                        <Input 
                          type="number" 
                          placeholder="Enter amount" 
                          value={cashAmount}
                          onChange={(e) => setCashAmount(e.target.value)}
                          className="text-lg font-bold h-12" 
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        className="w-full h-12 text-lg" 
                        onClick={() => handleCheckout('CASH', Number(cashAmount) || total)}
                      >
                        Complete Transaction
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isQrisOpen} onOpenChange={setIsQrisOpen}>
                  <DialogTrigger render={<Button variant="outline" className="h-24 flex flex-col gap-2" />}>
                    <QrCode className="h-8 w-8 text-blue-500" />
                    <span>QRIS</span>
                  </DialogTrigger>
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
                      <Button 
                        className="w-full" 
                        onClick={() => handleCheckout('QRIS', total)}
                      >
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
