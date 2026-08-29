"use client"

import { apiUrl } from "@/lib/api"
import { useState, useEffect, type CSSProperties } from "react"
import Link from "next/link"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
  CheckCircle2,
  AlertTriangle,
  Armchair,
  Clock3,
  Eye,
  ExternalLink,
  RefreshCw,
  UserRound,
  XCircle
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
  const [tables, setTables] = useState<any[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [selectedTableId, setSelectedTableId] = useState<string>("")
  const [orderType, setOrderType] = useState<string>("dine_in")
  const [customDiscountPercent, setCustomDiscountPercent] = useState("")
  const [storeSettings, setStoreSettings] = useState<any>({
    name: "BadakBizz",
    tax_rate: 11,
    service_charge_rate: 0,
    receipt_header: "BadakBizz",
    receipt_footer: "Thank you!"
  })
  
  // Dialog open states
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [isCashOpen, setIsCashOpen] = useState(false)
  const [isQrisOpen, setIsQrisOpen] = useState(false)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [receiptData, setReceiptData] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [variantProduct, setVariantProduct] = useState<any | null>(null)
  const [notice, setNotice] = useState<{
    type: "error" | "success" | "info"
    message: string
  } | null>(null)

  // QRIS dynamic state
  const [qrisString, setQrisString] = useState<string | null>(null)
  const [qrisDialogTransaction, setQrisDialogTransaction] = useState<any | null>(null)
  const [pendingQrisTransactions, setPendingQrisTransactions] = useState<any[]>([])
  const [pendingQrisActionId, setPendingQrisActionId] = useState<number | null>(null)
  const [pendingQrisLastRefresh, setPendingQrisLastRefresh] = useState<Date | null>(null)
  const [pendingCancelQrisTransaction, setPendingCancelQrisTransaction] = useState<any | null>(null)
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)

  const fetchProductsAndCustomers = async () => {
    setIsLoading(true)
    try {
      const headers = { "Authorization": `Bearer ${token}` }
      const [productsRes, customersRes, settingsRes, tablesRes, pendingQrisRes] = await Promise.all([
        fetch(apiUrl('/api/products'), { headers }),
        fetch(apiUrl('/api/customers'), { headers }),
        fetch(apiUrl('/api/settings'), { headers }),
        fetch(apiUrl('/api/tables'), { headers }),
        fetch(apiUrl('/api/transactions?status=PENDING&payment_method=QRIS&per_page=5'), { headers })
      ])
      
      const productsData = await productsRes.json()
      const customersData = await customersRes.json()
      const settingsData = await settingsRes.json()
      const tablesData = await tablesRes.json()
      const pendingQrisData = await pendingQrisRes.json()
      
      setProducts(Array.isArray(productsData) ? productsData : [])
      setCustomers(Array.isArray(customersData) ? customersData : [])
      setTables(Array.isArray(tablesData) ? tablesData : [])
      setPendingQrisTransactions(Array.isArray(pendingQrisData?.data) ? pendingQrisData.data : [])
      setPendingQrisLastRefresh(new Date())
      if (settingsData && settingsData.name) {
        setStoreSettings(settingsData)
      }
    } catch (error) {
      console.error("Failed to fetch data:", error)
      setNotice({
        type: "error",
        message: "Gagal memuat data POS. Periksa koneksi backend lalu coba refresh.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchProductsAndCustomers()
    }
  }, [token])

  useEffect(() => {
    if (orderType !== "dine_in") {
      setSelectedTableId("")
    }
  }, [orderType])

  // --- BARCODE SCANNER LISTENER ---
  useEffect(() => {
    let scannedStr = ""
    let timeoutId: NodeJS.Timeout

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is explicitly typing in an input field (like Search or Checkout Cash)
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return
      }

      if (e.key === "Enter") {
        if (scannedStr.trim().length > 0) {
          e.preventDefault()
          const matchedVariantProduct = products.find(p => p.variants?.some((variant: any) => variant.sku === scannedStr))
          const matchedVariant = matchedVariantProduct?.variants?.find((variant: any) => variant.sku === scannedStr)
          const matchedProduct = products.find(p => p.sku === scannedStr || p.barcode === scannedStr)
          if (matchedVariantProduct && matchedVariant) {
            addToCart(buildCartItem(matchedVariantProduct, matchedVariant))
          } else if (matchedProduct) {
            handleProductSelect(matchedProduct)
          } else {
            setNotice({
              type: "error",
              message: `Produk dengan SKU / Barcode "${scannedStr}" tidak ditemukan.`,
            })
          }
          scannedStr = ""
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scannedStr += e.key
      }

      // Barcode scanners type very fast. Clear buffer if typing stops for > 50ms.
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        scannedStr = ""
      }, 50) 
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      clearTimeout(timeoutId)
    }
  }, [products]) // Depends on products so it can find the matched product
  // ---------------------------------


  const productStock = (product: any) => product.has_variants
    ? (product.variants || []).reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0)
    : Number(product.stock || 0)

  const productPrice = (product: any) => {
    if (!product.has_variants) {
      return Number(product.selling_price)
    }

    const availableVariants = (product.variants || []).filter((variant: any) => Number(variant.stock || 0) > 0)
    const prices = availableVariants.map((variant: any) => Number(product.selling_price) + Number(variant.price_adjustment || 0))

    return prices.length > 0 ? Math.min(...prices) : Number(product.selling_price)
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) && 
    p.is_active && 
    productStock(p) > 0 &&
    (activeCategory === "All" || p.category?.name === activeCategory)
  )

  const categories = Array.from(new Set(products.map(p => p.category?.name).filter(Boolean))) as string[]

  const buildCartItem = (product: any, variant?: any) => ({
    cart_key: variant ? `${product.id}:${variant.id}` : `${product.id}`,
    id: product.id,
    product_id: product.id,
    variant_id: variant?.id || null,
    name: variant ? `${product.name} - ${variant.name}` : product.name,
    selling_price: Number(product.selling_price) + Number(variant?.price_adjustment || 0),
    stock: variant ? Number(variant.stock || 0) : Number(product.stock || 0),
    qty: 1,
  })

  const handleProductSelect = (product: any) => {
    if (product.has_variants) {
      setVariantProduct(product)
      return
    }

    addToCart(buildCartItem(product))
  }

  const addToCart = (cartProduct: any) => {
    setNotice(null)
    setCart(prev => {
      const existing = prev.find(item => item.cart_key === cartProduct.cart_key)
      if (existing) {
        if (existing.qty >= cartProduct.stock) {
          setNotice({
            type: "error",
            message: `Stok ${cartProduct.name} hanya ${cartProduct.stock}.`,
          })
          return prev
        }
        return prev.map(item => 
          item.cart_key === cartProduct.cart_key
            ? { ...item, qty: item.qty + 1 } 
            : item
        )
      }
      return [cartProduct, ...prev]
    })
  }

  const updateQty = (cartKey: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.cart_key === cartKey) {
          const newQty = Math.max(0, Math.min(item.qty + delta, item.stock || 999))
          return { ...item, qty: newQty }
        }
        return item
      }).filter(item => item.qty > 0)
    })
  }

  const removeFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(item => item.cart_key !== cartKey))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.qty), 0)
  const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId)
  const selectedTable = tables.find(t => t.id.toString() === selectedTableId)
  const tableManagementEnabled = storeSettings.enable_table_management == 1 || storeSettings.enable_table_management === true
  const availableTables = tables.filter(table => table.status === "available" || table.id.toString() === selectedTableId)
  const requiresTable = tableManagementEnabled && orderType === "dine_in"
  const canCheckout = cart.length > 0 && (!requiresTable || Boolean(selectedTableId))
  const checkoutHint = cart.length === 0
    ? "Tambahkan produk ke keranjang untuk mulai checkout."
    : requiresTable && !selectedTableId
      ? "Pilih meja terlebih dahulu untuk pesanan dine-in."
      : null
  
  const memberDiscountPercent = selectedCustomer ? 5 : 0
  const additionalDiscountPercent = Number(customDiscountPercent) || 0
  const totalDiscountPercent = Math.min(100, memberDiscountPercent + additionalDiscountPercent)
  const discount = Math.round(subtotal * (totalDiscountPercent / 100))
  const netAfterDiscount = subtotal - discount
  // Biaya Layanan hanya diterapkan jika tipe pesanan = takeaway
  const serviceChargeRate = (storeSettings.service_charge_rate && orderType === 'takeaway') ? (Number(storeSettings.service_charge_rate) / 100) : 0
  const serviceCharge = Math.round(netAfterDiscount * serviceChargeRate)
  const taxRate = storeSettings.tax_rate ? (Number(storeSettings.tax_rate) / 100) : 0
  const tax = Math.round((netAfterDiscount + serviceCharge) * taxRate)
  const total = netAfterDiscount + serviceCharge + tax

  const handleCheckout = async (paymentMethod: string, paymentAmount: number) => {
    if (!canCheckout) {
      setNotice({
        type: "error",
        message: checkoutHint || "Lengkapi pesanan sebelum checkout.",
      })
      return
    }

    setNotice(null)
    setIsProcessing(true)
    try {
      const res = await fetch(apiUrl('/api/transactions'), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          items: cart.map(item => ({
            product_id: item.product_id,
            variant_id: item.variant_id || undefined,
            quantity: item.qty
          })),
          customer_id: selectedCustomerId || null,
          table_id: orderType === "dine_in" && selectedTableId ? selectedTableId : null,
          payment_method: paymentMethod,
          payment_amount: paymentAmount,
          discount: discount,
          order_type: orderType
        })
      })

      const data = await res.json()
      if (res.ok) {
        const txn = data.data
        if (paymentMethod === 'QRIS') {
          // Hit QRIS generate API
          const qrisRes = await fetch(apiUrl('/api/qris/generate'), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              order_id: txn.transaction_number,
              gross_amount: txn.total_amount
            })
          })
          
          const qrisData = await qrisRes.json()
          if (qrisRes.ok && qrisData.status === 'success') {
            setQrisString(qrisData.qr_string)
            setQrisDialogTransaction({
              ...txn,
              qris_string: qrisData.qr_string,
            })
            
            // Keep the receipt data ready for when polling finishes
            setReceiptData({
              transaction_number: txn?.transaction_number || "TRX-PENDING",
              items: [...cart],
              subtotal: Number(txn?.subtotal ?? subtotal),
              discount: Number(txn?.discount ?? discount),
              service_charge: Number(txn?.service_charge ?? serviceCharge),
              tax: Number(txn?.tax ?? tax),
              total: Number(txn?.total_amount ?? total),
              paymentMethod,
              paymentAmount,
              change: paymentAmount - Number(txn?.total_amount ?? total),
              date: new Date().toLocaleString("id-ID"),
              cashierName: user?.name || 'Unknown',
              customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in',
              tableName: selectedTable ? selectedTable.name : null
            })
            
            setCart([])
            setSelectedCustomerId("")
            setSelectedTableId("")
            setCashAmount("")
            setIsCheckoutOpen(false)
            setIsQrisOpen(true)
            setNotice({
              type: "info",
              message: "Transaksi QRIS dibuat sebagai pending. Stok dan meja sudah diperbarui.",
            })
            fetchProductsAndCustomers()
          } else {
            setNotice({
              type: "error",
              message: "Gagal memuat QRIS: " + (qrisData.message || "Kesalahan API"),
            })
          }
        } else {
          setReceiptData({
            transaction_number: txn?.transaction_number || "TRX-PENDING",
            items: [...cart],
            subtotal: Number(txn?.subtotal ?? subtotal),
            discount: Number(txn?.discount ?? discount),
            service_charge: Number(txn?.service_charge ?? serviceCharge),
            tax: Number(txn?.tax ?? tax),
            total: Number(txn?.total_amount ?? total),
            paymentMethod,
            paymentAmount,
            change: paymentAmount - Number(txn?.total_amount ?? total),
            date: new Date().toLocaleString("id-ID"),
            cashierName: user?.name || 'Unknown',
            customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in',
            tableName: selectedTable ? selectedTable.name : null
          })
          setCart([])
          setSelectedCustomerId("")
          setSelectedTableId("")
          setIsCashOpen(false)
          setIsCheckoutOpen(false)
          setIsReceiptOpen(true)
          setCashAmount("")
          setNotice({
            type: "success",
            message: "Transaksi tunai berhasil disimpan.",
          })
          fetchProductsAndCustomers() // refresh stock
          
          setTimeout(() => {
            handlePrint()
          }, 800)
        }
      } else {
        setNotice({
          type: "error",
          message: data.error || data.message || "Transaksi gagal diproses.",
        })
      }
    } catch {
      setNotice({
        type: "error",
        message: "Terjadi gangguan jaringan. Periksa backend lalu coba lagi.",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatPendingQrisTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatPendingQrisAge = (dateString: string) => {
    const createdAt = new Date(dateString).getTime()
    const referenceTime = pendingQrisLastRefresh?.getTime() ?? createdAt
    const diffInMinutes = Math.max(0, Math.floor((referenceTime - createdAt) / 60000))

    if (diffInMinutes < 1) {
      return "< 1 menit"
    }

    if (diffInMinutes < 60) {
      return `${diffInMinutes} menit`
    }

    const hours = Math.floor(diffInMinutes / 60)
    const minutes = diffInMinutes % 60

    return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`
  }

  const formatLastPendingQrisRefresh = () => {
    if (!pendingQrisLastRefresh) {
      return "belum diperbarui"
    }

    return pendingQrisLastRefresh.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const refreshPendingQris = async () => {
    if (!token) return

    try {
      const res = await fetch(apiUrl('/api/transactions?status=PENDING&payment_method=QRIS&per_page=5'), {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        setPendingQrisTransactions(Array.isArray(data?.data) ? data.data : [])
        setPendingQrisLastRefresh(new Date())
      }
    } catch {
      setNotice({
        type: "error",
        message: "Gagal memuat daftar QRIS pending.",
      })
    }
  }

  useEffect(() => {
    if (!token) return

    const intervalId = setInterval(() => {
      refreshPendingQris()
    }, 45000)

    return () => clearInterval(intervalId)
  }, [token])

  const handleShowPendingQris = (transaction: any) => {
    if (!transaction.qris_string) {
      setNotice({
        type: "error",
        message: "QRIS transaksi ini belum tersimpan. Cek dari Riwayat Transaksi atau buat ulang pembayaran.",
      })
      return
    }

    setQrisString(transaction.qris_string)
    setQrisDialogTransaction(transaction)
    setIsQrisOpen(true)
  }

  const handleCheckPendingQrisStatus = async (transaction: any) => {
    setPendingQrisActionId(transaction.id)
    setNotice(null)

    try {
      const res = await fetch(apiUrl(`/api/qris/status/${transaction.transaction_number}`), {
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal mengecek status QRIS")
      }

      setNotice({
        type: data.transaction_status === "PENDING" ? "info" : "success",
        message: `Status ${transaction.transaction_number}: ${data.transaction_status}`,
      })
      fetchProductsAndCustomers()
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal mengecek status QRIS",
      })
    } finally {
      setPendingQrisActionId(null)
    }
  }

  const handleCancelPendingQris = async (transaction: any) => {
    setPendingQrisActionId(transaction.id)
    setNotice(null)

    try {
      const res = await fetch(apiUrl(`/api/transactions/${transaction.id}/cancel-pending-qris`), {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal membatalkan QRIS pending")
      }

      setNotice({
        type: "success",
        message: `QRIS pending ${transaction.transaction_number} berhasil dibatalkan.`,
      })
      setPendingCancelQrisTransaction(null)
      fetchProductsAndCustomers()
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal membatalkan QRIS pending",
      })
    } finally {
      setPendingQrisActionId(null)
    }
  }

  return (
    <>
    <div className="flex flex-row gap-6 relative h-[calc(100vh-8rem)] w-full overflow-hidden">
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 gap-4 lg:gap-6 overflow-hidden h-full">
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Cari produk di sini..." 
              className="pl-12 h-12 bg-white text-base shadow-sm border-default-200 rounded-xl transition-shadow focus-visible:ring-primary/20 focus-visible:shadow-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 shrink-0 scrollbar-hide">
          <Badge 
            variant={activeCategory === "All" ? "default" : "secondary"} 
            className={`px-5 py-2 text-sm cursor-pointer transition-all duration-300 rounded-full border-transparent ${activeCategory === "All" ? "shadow-md bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-default-200 bg-white shadow-sm"}`}
            onClick={() => setActiveCategory("All")}
          >
            Semua
          </Badge>
          {categories.map(cat => (
            <Badge 
              key={cat}
              variant={activeCategory === cat ? "default" : "secondary"} 
              className={`px-5 py-2 text-sm cursor-pointer transition-all duration-300 rounded-full border-transparent ${activeCategory === cat ? "shadow-lg bg-slate-900 text-white hover:bg-slate-800 scale-105" : "hover:bg-slate-100 bg-white text-slate-600 shadow-sm hover:shadow-md"}`}
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
              <p className="text-lg font-medium text-default-600">Tidak ada produk aktif yang ditemukan.</p>
              <p className="text-sm">Coba sesuaikan pencarian atau filter kategori Anda.</p>
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
                    className="cursor-pointer border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 flex flex-col bg-white overflow-hidden rounded-2xl h-full group"
                    onClick={() => handleProductSelect(product)}
                  >
                    <CardContent className="p-4 flex flex-col items-center justify-center flex-1 text-center gap-2 relative">
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <div className="bg-primary text-primary-foreground rounded-full p-1 shadow-md"><Plus className="w-3 h-3"/></div>
                      </div>
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-primary font-black text-2xl mb-1 group-hover:scale-110 transition-transform duration-300 border border-slate-100">
                        {product.name.charAt(0)}
                      </div>
                      <div className="font-bold text-sm line-clamp-2 leading-tight text-slate-800 group-hover:text-primary transition-colors">{product.name}</div>
                      <div className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wider">
                        {product.has_variants ? `${product.variants?.length || 0} Varian` : `Stok: ${product.stock}`}
                      </div>
                      <div className="text-primary font-black text-base mt-auto pt-1">
                        {product.has_variants ? "Mulai " : ""}Rp {productPrice(product).toLocaleString("id-ID")}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Mobile Floating Cart Button */}
      <div className="md:hidden fixed bottom-6 left-0 right-0 flex justify-center z-40 px-4 pointer-events-none">
        <div className="bg-slate-900/95 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.6)] rounded-full p-2.5 flex items-center gap-4 text-white pointer-events-auto max-w-xl w-full border border-slate-700/50 backdrop-blur-xl transform transition-all hover:scale-[1.02]">
          <div className="flex-1 px-5 py-1 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] text-slate-300 font-bold uppercase tracking-widest">{cart.reduce((sum, item) => sum + item.qty, 0)} Item</span>
              <span className="text-xl sm:text-2xl font-black text-white leading-tight mt-0.5">Rp {total.toLocaleString("id-ID")}</span>
            </div>
          </div>
          <Button 
            className="h-12 sm:h-14 px-6 sm:px-8 text-sm sm:text-lg font-bold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20 text-white border-none"
            onClick={() => setIsCartModalOpen(true)}
          >
            <ShoppingCart className="w-5 h-5 mr-2 hidden sm:block" /> Pesanan
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isCartModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsCartModalOpen(false)}
        />
      )}

      {/* Right side: Persistent Cart (Desktop) & Slide-over (Mobile) */}
      <div className={`fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] md:relative md:w-[380px] lg:w-[420px] shrink-0 bg-white flex flex-col shadow-2xl md:shadow-xl md:rounded-[2rem] border-l md:border border-slate-100/50 overflow-hidden h-[100dvh] md:h-full transition-transform duration-300 ease-in-out ${isCartModalOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="flex flex-col min-w-0 flex-1 overflow-y-auto">
               <div className="p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-20 sticky top-0 shrink-0">
                  <div className="flex items-center gap-3 font-bold text-xl text-slate-900">
                    <Button variant="ghost" size="icon" className="md:hidden -ml-2 text-slate-500 hover:bg-slate-100" onClick={() => setIsCartModalOpen(false)}>
                      <Minus className="w-6 h-6 rotate-90" />
                    </Button>
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary hidden md:block">
                      <ShoppingCart className="w-6 h-6" />
                    </div>
                    Detail Pesanan
                  </div>
                  <Badge variant="default" className="rounded-full px-4 py-1.5 bg-primary font-bold shadow-sm">
                    {cart.reduce((sum, item) => sum + item.qty, 0)} items
                  </Badge>
               </div>

               {pendingQrisTransactions.length > 0 && (
                 <div className="border-b border-slate-100 bg-amber-50/70 p-4">
                   <div className="mb-3 flex items-center justify-between gap-3">
                     <div>
                       <div className="flex items-center gap-2 text-sm font-black text-amber-800">
                         <Clock3 className="h-4 w-4" />
                         QRIS Pending
                       </div>
                       <div className="mt-0.5 text-[11px] font-medium text-amber-700">
                         Auto-refresh tiap 45 detik. Terakhir {formatLastPendingQrisRefresh()}.
                       </div>
                     </div>
                     <Button
                       variant="ghost"
                       size="icon"
                       className="h-8 w-8 rounded-lg text-amber-700 hover:bg-amber-100"
                       onClick={refreshPendingQris}
                       disabled={pendingQrisActionId !== null}
                     >
                       <RefreshCw className="h-4 w-4" />
                     </Button>
                   </div>
                   <div className="space-y-2">
                     {pendingQrisTransactions.map(transaction => (
                       <div
                         key={transaction.id}
                         className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm"
                       >
                         <div className="flex items-start justify-between gap-3">
                           <div className="min-w-0">
                             <div className="truncate text-xs font-bold text-slate-900">
                               {transaction.transaction_number}
                             </div>
                             <div className="mt-1 text-[11px] font-medium text-slate-500">
                               {formatPendingQrisTime(transaction.created_at)} - {transaction.customer?.name || "Walk-in"}
                             </div>
                           </div>
                           <div className="shrink-0 text-right text-sm font-black text-amber-700">
                             Rp {Number(transaction.total_amount || 0).toLocaleString("id-ID")}
                           </div>
                         </div>
                         <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-amber-50/70 p-2 text-[11px] font-medium text-slate-600">
                           <div className="flex min-w-0 items-center gap-1.5">
                             <Clock3 className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                             <span className="truncate">Umur {formatPendingQrisAge(transaction.created_at)}</span>
                           </div>
                           <div className="flex min-w-0 items-center gap-1.5">
                             <Armchair className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                             <span className="truncate">{transaction.table?.name || "Takeaway"}</span>
                           </div>
                           <div className="col-span-2 flex min-w-0 items-center gap-1.5">
                             <UserRound className="h-3.5 w-3.5 shrink-0 text-amber-700" />
                             <span className="truncate">Kasir: {transaction.cashier?.name || "Tidak tercatat"}</span>
                           </div>
                         </div>
                         <div className="mt-3 grid grid-cols-2 gap-2">
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-9 rounded-lg border-slate-200 px-2 text-xs"
                             onClick={() => handleShowPendingQris(transaction)}
                             disabled={pendingQrisActionId !== null}
                           >
                             <Eye className="mr-1 h-3.5 w-3.5" />
                             QR
                           </Button>
                           <Link href="/transactions">
                             <Button
                               variant="outline"
                               size="sm"
                               className="h-9 w-full rounded-lg border-slate-200 px-2 text-xs"
                               disabled={pendingQrisActionId !== null}
                             >
                               <ExternalLink className="mr-1 h-3.5 w-3.5" />
                               Riwayat
                             </Button>
                           </Link>
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-9 rounded-lg border-blue-200 px-2 text-xs text-blue-700 hover:bg-blue-50"
                             onClick={() => handleCheckPendingQrisStatus(transaction)}
                             disabled={pendingQrisActionId !== null}
                           >
                             {pendingQrisActionId === transaction.id ? (
                               <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                             ) : (
                               <RefreshCw className="mr-1 h-3.5 w-3.5" />
                             )}
                             Cek
                           </Button>
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-9 rounded-lg border-red-200 px-2 text-xs text-red-700 hover:bg-red-50"
                             onClick={() => setPendingCancelQrisTransaction(transaction)}
                             disabled={pendingQrisActionId !== null}
                           >
                             <XCircle className="mr-1 h-3.5 w-3.5" />
                             Batal
                           </Button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}


               <div className="p-6 flex flex-col gap-3 shrink-0">
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
                        <p className="font-medium text-lg">Keranjang belanja kosong</p>
                        <p className="text-sm">Klik produk untuk menambahkannya.</p>
                      </motion.div>
                    ) : (
                      cart.map(item => (
                        <motion.div 
                          key={item.cart_key}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex gap-3 items-center bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 font-bold border border-slate-100">
                            {item.name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-900 truncate">{item.name}</div>
                            <div className="text-sm text-primary font-bold">
                              Rp {(item.selling_price * item.qty).toLocaleString("id-ID")}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-200">
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm transition-all" onClick={() => updateQty(item.cart_key, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center font-bold text-sm">{item.qty}</span>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-white hover:shadow-sm transition-all" onClick={() => updateQty(item.cart_key, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors" onClick={() => removeFromCart(item.cart_key)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>

                {/* Summary & Pay */}
                <div className="p-5 space-y-4 border-t border-slate-100 mt-auto shrink-0">
                 <h3 className="font-bold text-base text-slate-800 mb-2">Ringkasan Pembayaran</h3>
            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipe Pesanan</label>
              <select 
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
              >
                <option value="dine_in">Makan di Tempat (Dine In)</option>
                <option value="takeaway">Bungkus (Take Away)</option>
              </select>
            </div>

            {tableManagementEnabled && orderType === "dine_in" && (
              <div className="flex flex-col gap-1.5 mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Meja</label>
                <select
                  className={`w-full h-10 px-3 rounded-xl border bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                    requiresTable && !selectedTableId ? "border-amber-300" : "border-slate-200"
                  }`}
                  value={selectedTableId}
                  onChange={(e) => {
                    setSelectedTableId(e.target.value)
                    setNotice(null)
                  }}
                >
                  <option value="">Pilih meja dine-in</option>
                  {availableTables.map(table => (
                    <option key={table.id} value={table.id.toString()}>
                      {table.name}{table.status !== "available" ? ` (${table.status})` : ""}
                    </option>
                  ))}
                </select>
                {tables.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">Belum ada data meja. Tambahkan meja dari backend atau seed database.</p>
                )}
                {requiresTable && !selectedTableId && tables.length > 0 && (
                  <p className="text-xs text-amber-600 font-medium">Meja wajib dipilih untuk pesanan makan di tempat.</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pelanggan (Opsional)</label>
              <select 
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
              >
                <option value="">Walk-in (Tanpa Diskon Member)</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id.toString()}>{c.name} - {c.phone}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Diskon Tambahan (%)</label>
              <Input 
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 10" 
                value={customDiscountPercent}
                onChange={(e) => setCustomDiscountPercent(e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
            </div>
            
                 <div className="pt-4 border-t border-slate-100 space-y-2">
                    <div className="flex justify-between text-sm font-medium text-slate-600">
                      <span>Subtotal</span>
                      <span>Rp {subtotal.toLocaleString("id-ID")}</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-sm font-bold text-emerald-600">
                        <span>Diskon ({totalDiscountPercent}%)</span>
                        <span>- Rp {discount.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    {serviceCharge > 0 && (
                      <div className="flex justify-between text-sm font-medium text-slate-600">
                        <span>Biaya Layanan ({storeSettings.service_charge_rate}%)</span>
                        <span>Rp {serviceCharge.toLocaleString("id-ID")}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-medium text-slate-600">
                      <span>Pajak ({storeSettings.tax_rate}%)</span>
                      <span>Rp {tax.toLocaleString("id-ID")}</span>
                    </div>
                 </div>
               </div>
        </div>

               <div className="p-5 bg-slate-50 border-t border-slate-100 shadow-[0_-15px_40px_-15px_rgba(0,0,0,0.05)] z-20 shrink-0">
                  {notice && (
                    <div className={`mb-3 flex items-start gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                      notice.type === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : notice.type === "success"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-blue-200 bg-blue-50 text-blue-700"
                    }`}>
                      {notice.type === "error" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <span>{notice.message}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-2xl text-slate-900 mb-4">
                    <span>Total</span>
                    <span className="text-primary">Rp {total.toLocaleString("id-ID")}</span>
                  </div>
                  {checkoutHint && (
                    <p className="mb-3 text-center text-xs font-semibold text-amber-600">{checkoutHint}</p>
                  )}
                  
                  <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                    <DialogTrigger render={
                      <Button className="w-full h-16 text-xl font-black shadow-[0_10px_40px_-10px_rgba(79,70,229,0.5)] rounded-[1.25rem] transition-all hover:scale-[1.03] active:scale-[0.97] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border-none" disabled={!canCheckout}>
                        <Banknote className="w-6 h-6 mr-2" /> Checkout Sekarang
                      </Button>
                    } />
            <DialogContent className="!max-w-md w-[95vw] sm:w-full">
              <DialogHeader>
                <DialogTitle className="text-2xl">Checkout</DialogTitle>
                <DialogDescription>
                  Pilih metode pembayaran untuk menyelesaikan transaksi.
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
                  <span className="font-bold text-lg">Tunai</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-32 flex flex-col gap-3 rounded-2xl hover:border-blue-500 hover:bg-blue-50/50 transition-all border-2"
                  onClick={() => {
                    handleCheckout('QRIS', total)
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
               </div>
      </div>
    </div>
        {/* Cancel Pending QRIS Confirmation */}
          <Dialog
            open={Boolean(pendingCancelQrisTransaction)}
            onOpenChange={(open) => !open && setPendingCancelQrisTransaction(null)}
          >
            <DialogContent className="!max-w-sm w-[95vw] sm:w-full rounded-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Batalkan QRIS Pending?
                </DialogTitle>
                <DialogDescription>
                  Transaksi {pendingCancelQrisTransaction?.transaction_number} akan dibatalkan. Stok produk dan status meja akan dikembalikan.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-xl font-semibold"
                  onClick={() => setPendingCancelQrisTransaction(null)}
                  disabled={pendingQrisActionId !== null}
                >
                  Tidak Jadi
                </Button>
                <Button
                  className="rounded-xl bg-red-600 font-bold text-white hover:bg-red-700"
                  onClick={() => pendingCancelQrisTransaction && handleCancelPendingQris(pendingCancelQrisTransaction)}
                  disabled={pendingQrisActionId !== null}
                >
                  {pendingQrisActionId === pendingCancelQrisTransaction?.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Membatalkan...
                    </>
                  ) : (
                    "Batalkan QRIS"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        {/* Variant Picker Dialog */}
          <Dialog open={Boolean(variantProduct)} onOpenChange={(open) => !open && setVariantProduct(null)}>
            <DialogContent className="!max-w-md w-[95vw] sm:w-full rounded-2xl">
              <DialogHeader>
                <DialogTitle>Pilih Varian</DialogTitle>
                <DialogDescription>
                  {variantProduct?.name}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                {(variantProduct?.variants || [])
                  .filter((variant: any) => Number(variant.stock || 0) > 0)
                  .map((variant: any) => (
                    <button
                      key={variant.id}
                      type="button"
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => {
                        addToCart(buildCartItem(variantProduct, variant))
                        setVariantProduct(null)
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{variant.name}</div>
                        <div className="text-xs font-medium text-slate-500">Stok: {variant.stock}</div>
                      </div>
                      <div className="text-right font-black text-primary">
                        Rp {(Number(variantProduct?.selling_price || 0) + Number(variant.price_adjustment || 0)).toLocaleString("id-ID")}
                      </div>
                    </button>
                  ))}
                {(variantProduct?.variants || []).filter((variant: any) => Number(variant.stock || 0) > 0).length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm font-medium text-slate-500">
                    Semua varian sedang habis.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

        {/* Cash Payment Dialog */}
          <Dialog open={isCashOpen} onOpenChange={setIsCashOpen}>
            <DialogContent className="!max-w-sm w-[95vw] sm:w-full rounded-2xl">
              <DialogHeader>
                <DialogTitle>Pembayaran Tunai</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-6">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border">
                  <span className="font-semibold text-default-600">Total Tagihan</span>
                  <span className="text-2xl font-black text-primary">Rp {total.toLocaleString("id-ID")}</span>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-semibold">Uang Diterima</label>
                  <Input 
                    type="text" 
                    placeholder="Masukkan jumlah (cth. 100.000)" 
                    value={cashAmount ? Number(cashAmount).toLocaleString("id-ID") : ""}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "")
                      setCashAmount(rawValue)
                    }}
                    className="text-xl font-bold h-14 px-4 rounded-xl" 
                    autoFocus
                  />
                  {Number(cashAmount) > 0 && Number(cashAmount) < total && (
                    <p className="text-sm text-destructive font-medium">Jumlah uang kurang dari total tagihan.</p>
                  )}
                  {Number(cashAmount) >= total && (
                    <p className="text-sm text-green-600 font-medium">Kembalian: Rp {(Number(cashAmount) - total).toLocaleString("id-ID")}</p>
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
                      Memproses...
                    </>
                  ) : (
                    "Selesaikan Transaksi"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* QRIS Payment Dialog */}
          <Dialog
            open={isQrisOpen}
            onOpenChange={(open) => {
              setIsQrisOpen(open)
              if (!open) {
                setQrisDialogTransaction(null)
              }
            }}
          >
            <DialogContent className="!max-w-sm w-[95vw] sm:w-full text-center rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-center">Pembayaran QRIS</DialogTitle>
              </DialogHeader>
              <div className="py-8 flex flex-col items-center justify-center gap-6">
                <div className="w-56 h-56 bg-slate-50 flex items-center justify-center border-2 border-dashed border-primary/30 rounded-2xl p-4">
                  {qrisString ? (
                    <QRCodeSVG value={qrisString} size={180} />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
                      <span className="text-sm font-medium text-muted-foreground">Memuat QRIS...</span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Scan menggunakan e-Wallet atau Mobile Banking</p>
                  <p className="text-xs font-semibold text-slate-500">
                    {qrisDialogTransaction?.transaction_number || receiptData?.transaction_number}
                  </p>
                  <div className="text-3xl font-black text-primary">
                    Rp {Number(qrisDialogTransaction?.total_amount ?? total).toLocaleString("id-ID")}
                  </div>
                  <p className="text-xs font-medium text-blue-600">Status transaksi: menunggu pembayaran</p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline"
                  className="w-full h-12 text-sm font-bold rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]" 
                  onClick={() => {
                    setIsQrisOpen(false)
                    fetchProductsAndCustomers()
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Tutup & Refresh POS
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Receipt Dialog */}
          <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
            <DialogContent className="!max-w-sm w-[95vw] sm:w-full rounded-2xl">
              <div className="flex flex-col items-center pt-6 pb-2 text-center">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>
                <h2 className="text-2xl font-black text-default-900">Pembayaran Berhasil!</h2>
                <p className="text-default-500 mt-1">Transaksi telah tersimpan.</p>
              </div>

              {/* Printable Receipt Area */}
              <div
                id="printable-receipt"
                style={{ "--receipt-width": `${Number(storeSettings.receipt_width || 80)}mm` } as CSSProperties}
                className="bg-white text-black text-sm print:text-[10px] font-mono flex flex-col gap-2 rounded-xl border shadow-sm mx-auto mb-2 p-5 print:m-0"
              >
                <div className="receipt-text text-center font-bold text-lg print:text-[13px] leading-tight mb-1">
                  {storeSettings.receipt_header || storeSettings.name || 'BadakBizz'}
                </div>
                <div className="receipt-text text-center text-xs print:text-[9px] leading-snug font-normal text-gray-600 print:text-black mb-3">
                  {storeSettings.address || 'Alamat Toko'}<br />
                  Telp: {storeSettings.phone || '-'}
                </div>

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2"></div>

                <div className="receipt-row text-xs print:text-[9px] mb-2 font-medium text-gray-600 print:text-black">
                  <span className="receipt-text">{receiptData?.date}</span>
                  <span className="receipt-value receipt-text">{receiptData?.transaction_number}</span>
                </div>
                <div className="receipt-row text-xs print:text-[9px] mb-2 font-medium text-gray-600 print:text-black">
                  <span className="receipt-text">Kasir: {receiptData?.cashierName}</span>
                  <span className="receipt-value receipt-text">Pelanggan: {receiptData?.customerName}</span>
                </div>
                {receiptData?.tableName && (
                  <div className="receipt-row text-xs print:text-[9px] mb-2 font-medium text-gray-600 print:text-black">
                    <span>Meja</span>
                    <span className="receipt-value receipt-text">{receiptData.tableName}</span>
                  </div>
                )}

                <div className="border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 flex flex-col gap-2">
                  {receiptData?.items.map((item: any, i: number) => (
                    <div key={i} className="flex flex-col">
                      <div className="receipt-row font-bold print:font-semibold print:text-black">
                        <span className="receipt-text pr-1">{item.name}</span>
                        <span className="receipt-value receipt-money">Rp {(item.selling_price * item.qty).toLocaleString("id-ID")}</span>
                      </div>
                      <div className="text-xs print:text-[9px] text-gray-500 print:text-black">
                        {item.qty} x Rp {Number(item.selling_price).toLocaleString("id-ID")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="receipt-row text-xs print:text-[9px] print:text-black">
                  <span>Subtotal</span>
                  <span className="receipt-value receipt-money">Rp {receiptData?.subtotal.toLocaleString("id-ID")}</span>
                </div>
                {receiptData?.discount > 0 && (
                  <div className="receipt-row text-xs print:text-[9px] print:text-black">
                    <span>Diskon Member</span>
                    <span className="receipt-value receipt-money">- Rp {receiptData?.discount.toLocaleString("id-ID")}</span>
                  </div>
                )}
                {receiptData?.service_charge > 0 && (
                  <div className="receipt-row text-xs print:text-[9px] print:text-black">
                    <span className="receipt-text">Service Charge ({storeSettings.service_charge_rate}%)</span>
                    <span className="receipt-value receipt-money">Rp {receiptData?.service_charge.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="receipt-row text-xs print:text-[9px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Tax ({storeSettings.tax_rate}%)</span>
                  <span className="receipt-value receipt-money">Rp {receiptData?.tax.toLocaleString("id-ID")}</span>
                </div>
                
                <div className="receipt-row font-black text-lg print:text-[13px] mb-2 print:text-black">
                  <span>TOTAL</span>
                  <span className="receipt-value receipt-money">Rp {receiptData?.total.toLocaleString("id-ID")}</span>
                </div>

                <div className="receipt-row text-xs print:text-[9px] print:text-black">
                  <span>Bayar ({receiptData?.paymentMethod})</span>
                  <span className="receipt-value receipt-money">Rp {receiptData?.paymentAmount.toLocaleString("id-ID")}</span>
                </div>
                <div className="receipt-row text-xs print:text-[9px] border-b-2 border-dashed border-gray-300 print:border-black pb-2 mb-2 print:text-black">
                  <span>Kembali</span>
                  <span className="receipt-value receipt-money font-bold">Rp {receiptData?.change.toLocaleString("id-ID")}</span>
                </div>

                <div className="receipt-text text-center text-xs print:text-[9px] mt-2 print:mt-1 italic text-gray-500 print:text-black">
                  {storeSettings.receipt_footer || 'Terima kasih atas kunjungan Anda!'}
                </div>
                
                <div className="print:hidden border-t border-dashed mt-4 pt-4 text-center text-xs text-muted-foreground">
                  Ini adalah pratinjau struk yang akan dicetak.
                </div>
              </div>

              <DialogFooter className="sm:justify-between px-2 pb-2">
                <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setIsReceiptOpen(false)}>
                  Tutup
                </Button>
                <Button onClick={handlePrint} className="rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">
                  Cetak Struk
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      
      
    </>
  )
}
