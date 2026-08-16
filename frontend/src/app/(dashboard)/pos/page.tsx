"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Banknote,
  QrCode,
  Loader2,
  CheckCircle2
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
import { useAuth } from "@/context/AuthContext"

export default function POSPage() {
  const { token, user } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [cart, setCart] = useState<any[]>([])
  const [search, setSearch] = useState("")
  const [activeCategory, setActiveCategory] = useState("All")
  const [cashAmount, setCashAmount] = useState("")
  const [customers, setCustomers] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  
  // Dialog open states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCashOpen, setIsCashOpen] = useState(false)
  const [isQrisOpen, setIsQrisOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchProductsAndCustomers = async () => {
    setIsLoading(true)
    try {
      const [productsRes, customersRes] = await Promise.all([
        fetch("http://localhost:8000/api/products"),
        fetch("http://localhost:8000/api/customers")
      ])
      const productsData = await productsRes.json()
      const customersData = await customersRes.json()
      setProducts(Array.isArray(productsData) ? productsData : [])
      setCustomers(Array.isArray(customersData) ? customersData : [])
    } catch (error) {
      console.error("Failed to fetch data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProductsAndCustomers()
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
      return [{ ...product, qty: 1 }, ...prev]
    })
  }

  const updateQty = (id: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === id) {
          const product = products.find(p => p.id === id)
          const newQty = Math.max(0, Math.min(item.qty + delta, product?.stock || 999))
          return { ...item, qty: newQty }
        }
        return item
      }).filter(item => item.qty > 0)
    })
  }

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.qty), 0)
  const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId)
  const discount = selectedCustomer ? subtotal * 0.05 : 0
  const tax = (subtotal - discount) * 0.11 // 11% tax
  const total = subtotal - discount + tax

  const handleCheckout = async (paymentMethod: string, paymentAmount: number) => {
    setIsProcessing(true)
    try {
      const res = await fetch("http://localhost:8000/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.qty
          })),
          customer_id: selectedCustomerId || null,
          payment_method: paymentMethod,
          payment_amount: paymentAmount
        })
      })

      const data = await res.json()
      if (res.ok) {
        setReceiptData({
          transaction_number: data.data?.transaction_number || "TRX-" + Date.now(),
          items: [...cart],
          subtotal,
          discount,
          tax,
          total,
          paymentMethod,
          paymentAmount,
          change: paymentAmount - total,
          date: new Date().toLocaleString("id-ID"),
          cashierName: user?.name || 'Unknown',
          customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in'
        })
        setCart([])
        setSelectedCustomerId("")
        setIsCashOpen(false)
        setIsQrisOpen(false)
        setIsCheckoutOpen(false)
        setIsReceiptOpen(true)
        setCashAmount("")
        fetchProductsAndCustomers() // refresh stock
        
        // Auto-trigger print for seamless Kiosk printing experience
        setTimeout(() => {
          handlePrint()
        }, 800)

      } else {
        alert("Error: " + (data.message || "Failed"))
      }
    } catch (error) {
      alert("Network error, please try again.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="flex flex-col lg:flex-row lg:h-[calc(100vh-8rem)] gap-4 lg:gap-6">
      
      {/* LEFT: Product Grid */}
      <div className="lg:flex-1 flex flex-col min-w-0 gap-4 lg:gap-6 overflow-hidden h-[70vh] lg:h-auto">
        <div className="relative shrink-0">
          <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search for your products here..." 
            className="pl-12 h-12 bg-white text-base shadow-sm border-default-200 rounded-xl transition-shadow focus-visible:ring-primary/20 focus-visible:shadow-md"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide">
          <Badge 
            variant={activeCategory === "All" ? "default" : "secondary"} 
            className={`px-5 py-2 text-sm cursor-pointer transition-all duration-300 rounded-full border-transparent ${activeCategory === "All" ? "shadow-md bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-default-200 bg-white shadow-sm"}`}
            onClick={() => setActiveCategory("All")}
          >
            All
          </Badge>
          {categories.map(cat => (
            <Badge 
              key={cat}
              variant={activeCategory === cat ? "default" : "secondary"} 
              className={`px-5 py-2 text-sm cursor-pointer transition-all duration-300 rounded-full border-transparent ${activeCategory === cat ? "shadow-md bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-default-200 bg-white shadow-sm"}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3 overflow-y-auto pr-2 pb-4 scroll-smooth flex-1 content-start">
          {isLoading ? (
            <div className="col-span-full flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center py-20 text-muted-foreground bg-white/50 rounded-2xl border border-dashed border-default-200">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <p className="text-lg font-medium text-default-600">No active products found.</p>
              <p className="text-sm">Try adjusting your search or category filter.</p>
            </div>
          ) : (
            <AnimatePresence>
              {filteredProducts.map(product => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  key={product.id}
                >
                  <Card 
                    className="cursor-pointer border-none shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col bg-white group overflow-hidden rounded-xl h-full min-h-[160px]"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-3 flex flex-col items-center justify-center flex-1 text-center gap-1.5 relative">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 text-[9px] px-1.5 py-0">Add</Badge>
                      </div>
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-lg mb-1 shadow-inner group-hover:scale-110 transition-transform duration-300">
                        {product.name.charAt(0)}
                      </div>
                      <div className="font-semibold text-xs line-clamp-2 leading-tight text-default-900 group-hover:text-primary transition-colors">{product.name}</div>
                      <div className="text-[9px] font-medium px-2 py-0.5 bg-default-100 rounded-full text-default-500">Stock: {product.stock}</div>
                      <div className="text-primary font-bold text-sm mt-auto pt-1">
                        Rp {Number(product.selling_price).toLocaleString("id-ID")}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* RIGHT: Cart */}
      <div className="w-full lg:w-[400px] shrink-0 border-none shadow-lg rounded-2xl flex flex-col bg-white overflow-hidden h-[60vh] lg:h-auto lg:flex-none">
        <div className="p-5 bg-slate-50 border-b flex items-center gap-3 font-bold text-lg text-default-900">
          <div className="p-2 bg-primary/10 rounded-xl text-primary">
            <ShoppingCart className="w-5 h-5" />
          </div>
          Current Order
          <Badge variant="default" className="ml-auto rounded-full px-3 py-1 bg-primary">
            {cart.reduce((sum, item) => sum + item.qty, 0)} items
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3 bg-slate-50/50">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 flex flex-col items-center justify-center text-muted-foreground mt-10"
              >
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="w-10 h-10 opacity-30" />
                </div>
                <p className="font-medium text-lg">Your cart is empty</p>
                <p className="text-sm">Click on a product to add it.</p>
              </motion.div>
            ) : (
              cart.map(item => (
                <motion.div 
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex gap-3 items-center bg-white p-3 rounded-xl border border-default-100 shadow-sm group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-default-900 truncate">{item.name}</div>
                    <div className="text-sm text-primary font-bold">
                      Rp {(item.selling_price * item.qty).toLocaleString("id-ID")}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm transition-all" onClick={() => updateQty(item.id, -1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center font-bold text-sm">{item.qty}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm transition-all" onClick={() => updateQty(item.id, 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-default-400 hover:text-destructive hover:bg-destructive/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => removeFromCart(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 bg-white border-t shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-10">
          <div className="space-y-3 mb-6">
            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-xs font-semibold text-default-600">Customer (Optional)</label>
              <select 
                className="w-full h-10 px-3 rounded-lg border border-default-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="">Walk-in (No Member Discount)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-between text-sm font-medium text-default-600">
              <span>Subtotal</span>
              <span>Rp {subtotal.toLocaleString("id-ID")}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm font-bold text-emerald-600">
                <span>Member Disc (5%)</span>
                <span>- Rp {discount.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-medium text-default-600">
              <span>Tax (11%)</span>
              <span>Rp {tax.toLocaleString("id-ID")}</span>
            </div>
            <Separator className="my-3 border-dashed" />
            <div className="flex justify-between font-black text-2xl text-default-900">
              <span>Total</span>
              <span className="text-primary">Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogTrigger render={
              <Button className="w-full h-14 text-lg font-bold shadow-lg shadow-primary/25 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]" disabled={cart.length === 0}>
                Pay Rp {total.toLocaleString("id-ID")}
              </Button>
            } />
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-2xl">Checkout</DialogTitle>
                <DialogDescription>
                  Select a payment method to complete the transaction.
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-2 gap-4 py-4">
                <Button 
                  variant="outline" 
                  className="h-32 flex flex-col gap-3 rounded-2xl hover:border-green-500 hover:bg-green-50/50 transition-all border-2"
                  onClick={() => {
                    setIsCheckoutOpen(false)
                    setIsCashOpen(true)
                  }}
                >
                  <div className="p-3 bg-green-100 rounded-full text-green-600">
                    <Banknote className="h-8 w-8" />
                  </div>
                  <span className="font-bold text-lg">Cash</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-32 flex flex-col gap-3 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all border-2"
                  onClick={() => {
                    setIsCheckoutOpen(false)
                    setIsQrisOpen(true)
                  }}
                >
                  <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                    <QrCode className="h-8 w-8" />
                  </div>
                  <span className="font-bold text-lg">QRIS</span>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Cash Payment Dialog */}
          <Dialog open={isCashOpen} onOpenChange={setIsCashOpen}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
              <DialogHeader>
                <DialogTitle>Cash Payment</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border">
                  <span className="font-semibold text-default-600">Total to Pay</span>
                  <span className="text-2xl font-black text-primary">Rp {total.toLocaleString("id-ID")}</span>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Cash Received</label>
                  <Input 
                    type="text" 
                    placeholder="Enter amount (e.g. 100.000)" 
                    value={cashAmount ? Number(cashAmount).toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "")
                      setCashAmount(rawValue)
                    }}
                    className="text-xl font-bold h-14 px-4 rounded-xl" 
                    autoFocus
                  />
                  {Number(cashAmount) > 0 && Number(cashAmount) < total && (
                    <p className="text-sm text-destructive font-medium">Amount is less than the total.</p>
                  )}
                  {Number(cashAmount) >= total && (
                    <p className="text-sm text-green-600 font-medium">Change: Rp {(Number(cashAmount) - total).toLocaleString("id-ID")}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="w-full h-14 text-lg font-bold rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={(Number(cashAmount) > 0 && Number(cashAmount) < total) || isProcessing}
                  onClick={() => handleCheckout('CASH', Number(cashAmount) || total)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Complete Transaction"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* QRIS Payment Dialog */}
          <Dialog open={isQrisOpen} onOpenChange={setIsQrisOpen}>
            <DialogContent className="sm:max-w-sm text-center rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-center">QRIS Payment</DialogTitle>
              </DialogHeader>
              <div className="py-8 flex flex-col items-center justify-center gap-6">
                <div className="w-56 h-56 bg-slate-50 flex items-center justify-center border-2 border-dashed border-primary/30 rounded-2xl">
                  <QrCode className="w-40 h-40 text-primary/80" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Scan using any supported e-Wallet</p>
                  <div className="text-3xl font-black text-primary">Rp {total.toLocaleString("id-ID")}</div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  className="w-full h-14 text-lg font-bold rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]" 
                  disabled={isProcessing}
                  onClick={() => handleCheckout('QRIS', total)}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Verify Payment"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Receipt Dialog */}
          <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
            <DialogContent className="sm:max-w-sm rounded-2xl">
              <div className="flex flex-col items-center pt-6 pb-2 text-center">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <h2 className="text-2xl font-black text-default-900">Payment Success!</h2>
                <p className="text-default-500 mt-1">Transaction has been recorded.</p>
              </div>

              {/* Printable Receipt Area */}
              <div id="printable-receipt" className="p-5 print:p-0 bg-white text-black text-sm print:text-xs font-mono flex flex-col gap-2 rounded-xl border print:border-none print:shadow-none mx-2 mb-2 print:m-0 print:w-[300px] print:absolute print:top-0 print:left-0">
                <div className="text-center font-bold text-lg print:text-base mb-1">
                  KIVO POS
                </div>
                <div className="text-center text-xs print:text-[10px] font-normal text-gray-600 print:text-black mb-3">
                  Jl. Teknologi No. 1, Jakarta<br />
                  Telp: 0812-3456-7890
                </div>

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2"></div>

                <div className="flex justify-between text-xs print:text-[10px] mb-2 font-medium text-gray-600 print:text-black">
                  <span>{receiptData?.date}</span>
                  <span>{receiptData?.transaction_number}</span>
                </div>
                <div className="flex justify-between text-xs print:text-[10px] mb-2 font-medium text-gray-600 print:text-black">
                  <span>Cashier: {receiptData?.cashierName}</span>
                  <span>Cust: {receiptData?.customerName}</span>
                </div>

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 flex flex-col gap-2">
                  {receiptData?.items.map((item: any, i: number) => (
                    <div key={i} className="flex flex-col">
                      <div className="flex justify-between font-bold print:font-semibold print:text-black">
                        <span className="truncate pr-2">{item.name}</span>
                        <span className="whitespace-nowrap">Rp {(item.selling_price * item.qty).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="text-xs print:text-[10px] text-gray-500 print:text-black">
                        {item.qty} x Rp {Number(item.selling_price).toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between text-xs print:text-[10px] print:text-black">
                  <span>Subtotal</span>
                  <span>Rp {receiptData?.subtotal.toLocaleString("id-ID")}</span>
                </div>
                {receiptData?.discount > 0 && (
                  <div className="flex justify-between text-xs print:text-[10px] print:text-black">
                    <span>Member Disc</span>
                    <span>- Rp {receiptData?.discount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between text-xs print:text-[10px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Tax (11%)</span>
                  <span>Rp {receiptData?.tax.toLocaleString("id-ID")}</span>
                </div>
                
                <div className="flex justify-between font-black text-lg print:text-base mb-2 print:text-black">
                  <span>TOTAL</span>
                  <span>Rp {receiptData?.total.toLocaleString("id-ID")}</span>
                </div>

                <div className="flex justify-between text-xs print:text-[10px] print:text-black">
                  <span>Pay ({receiptData?.paymentMethod})</span>
                  <span>Rp {receiptData?.paymentAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-xs print:text-[10px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Change</span>
                  <span className="font-bold">Rp {receiptData?.change.toLocaleString("id-ID")}</span>
                </div>

                <div className="text-center text-xs print:text-[10px] mt-2 print:mt-1 italic text-gray-500 print:text-black">
                  Thank you for your purchase!<br/>
                  Please come again.
                </div>
                
                <div className="print:hidden border-t border-dashed mt-4 pt-4 text-center text-xs text-muted-foreground">
                  This is a preview of the printed receipt.
                </div>
              </div>

              <DialogFooter className="sm:justify-between px-2 pb-2">
                <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setIsReceiptOpen(false)}>
                  Close
                </Button>
                <Button onClick={handlePrint} className="rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">
                  Print Receipt
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
    </div>
  )
}
