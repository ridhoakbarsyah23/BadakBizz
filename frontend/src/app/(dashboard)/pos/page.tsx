"use client"

import { apiUrl } from "@/lib/api"
import { AutoDismissNotice } from "@/components/auto-dismiss-notice"
import { useState, useEffect, type CSSProperties } from "react"
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
  RefreshCw,
  CalendarClock,
  LogIn,
  LogOut
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
  const [currentShift, setCurrentShift] = useState<any | null>(null)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("")
  const [selectedTableId, setSelectedTableId] = useState<string>("")
  const [orderType, setOrderType] = useState<string>("dine_in")
  const [orderNotes, setOrderNotes] = useState("")
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
  const [isShiftDialogOpen, setIsShiftDialogOpen] = useState(false)
  const [shiftAction, setShiftAction] = useState<"open" | "close">("open")
  const [shiftCashAmount, setShiftCashAmount] = useState("")
  const [isShiftProcessing, setIsShiftProcessing] = useState(false)
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
  const [isQrisChecking, setIsQrisChecking] = useState(false)
  const [isQrisCancelling, setIsQrisCancelling] = useState(false)
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)

  const fetchProductsAndCustomers = async () => {
    setIsLoading(true)
    try {
      const headers = { "Authorization": `Bearer ${token}` }
      const [productsRes, customersRes, settingsRes, tablesRes, currentShiftRes] = await Promise.all([
        fetch(apiUrl('/api/products'), { headers }),
        fetch(apiUrl('/api/customers'), { headers }),
        fetch(apiUrl('/api/settings'), { headers }),
        fetch(apiUrl('/api/tables'), { headers }),
        fetch(apiUrl('/api/shifts/current'), { headers })
      ])
      
      const productsData = await productsRes.json()
      const customersData = await customersRes.json()
      const settingsData = await settingsRes.json()
      const tablesData = await tablesRes.json()
      const currentShiftData = currentShiftRes.ok ? await currentShiftRes.json() : null
      
      setProducts(Array.isArray(productsData) ? productsData : [])
      setCustomers(Array.isArray(customersData) ? customersData : [])
      setTables(Array.isArray(tablesData) ? tablesData : [])
      setCurrentShift(currentShiftData?.shift ?? null)
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

  const availableVariantCount = (product: any) =>
    (product.variants || []).filter((variant: any) => Number(variant.stock || 0) > 0).length

  const variantPrice = (product: any, variant: any) =>
    Number(product?.selling_price || 0) + Number(variant?.price_adjustment || 0)

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

  const updateItemNote = (cartKey: string, notes: string) => {
    setCart(prev => prev.map(item =>
      item.cart_key === cartKey
        ? { ...item, notes }
        : item
    ))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.selling_price * item.qty), 0)
  const selectedCustomer = customers.find(c => c.id.toString() === selectedCustomerId)
  const selectedTable = tables.find(t => t.id.toString() === selectedTableId)
  const tableManagementEnabled = storeSettings.enable_table_management == 1 || storeSettings.enable_table_management === true
  const kitchenReceiptsEnabled = storeSettings.enable_kitchen_receipts == 1 || storeSettings.enable_kitchen_receipts === true
  const shiftManagementEnabled = storeSettings.enable_shift_management == 1 || storeSettings.enable_shift_management === true
  const availableTables = tables.filter(table => table.status === "available" || table.id.toString() === selectedTableId)
  const requiresTable = tableManagementEnabled && orderType === "dine_in" && tables.length > 0
  const requiresShift = shiftManagementEnabled && !currentShift
  const canCheckout = cart.length > 0 && !requiresShift && (!requiresTable || Boolean(selectedTableId))
  const checkoutHint = cart.length === 0
    ? "Tambahkan produk ke keranjang untuk mulai checkout."
    : requiresShift
      ? "Buka shift kasir terlebih dahulu sebelum checkout."
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
  const currentShiftCashSales = Number(currentShift?.cash_sales || 0)
  const currentShiftExpectedCash = Number(currentShift?.expected_cash || currentShift?.starting_cash || 0)
  const closeShiftCashAmount = Number(shiftCashAmount || 0)
  const closeShiftDiscrepancy = closeShiftCashAmount - currentShiftExpectedCash

  const formatCurrency = (value: number | string | null | undefined) => {
    return Math.round(Number(value || 0)).toLocaleString("id-ID")
  }

  const getReceiptItemParts = (item: any) => {
    const nameParts = String(item.name || "").split(" - ")
    return {
      name: nameParts[0] || item.name || "-",
      variantName: item.variant_name || (nameParts.length > 1 ? nameParts.slice(1).join(" - ") : ""),
    }
  }

  const formatReceiptDate = () => {
    return new Date().toLocaleString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatShiftDate = (value?: string | null) => {
    if (!value) return "-"
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const openShiftDialog = (action: "open" | "close") => {
    setShiftAction(action)
    setShiftCashAmount("")
    setIsShiftDialogOpen(true)
  }

  const handleShiftSubmit = async () => {
    setIsShiftProcessing(true)
    setNotice(null)

    try {
      const endpoint = shiftAction === "open" ? "/api/shifts/open" : "/api/shifts/close"
      const payload = shiftAction === "open"
        ? { starting_cash: Number(shiftCashAmount || 0) }
        : { ending_cash: Number(shiftCashAmount || 0) }

      const res = await fetch(apiUrl(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || "Gagal memperbarui shift kasir.")
      }

      setCurrentShift(shiftAction === "open" ? data.shift : null)
      setIsShiftDialogOpen(false)
      setShiftCashAmount("")
      setNotice({
        type: "success",
        message: shiftAction === "open"
          ? "Shift kasir sudah dibuka. Checkout sekarang bisa dilakukan."
          : "Shift kasir sudah ditutup. Buka shift baru sebelum checkout berikutnya.",
      })
      fetchProductsAndCustomers()
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal memperbarui shift kasir.",
      })
    } finally {
      setIsShiftProcessing(false)
    }
  }

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
            quantity: item.qty,
            notes: item.notes?.trim() || undefined
          })),
          customer_id: selectedCustomerId || null,
          table_id: tableManagementEnabled && orderType === "dine_in" && selectedTableId ? selectedTableId : null,
          payment_method: paymentMethod,
          payment_amount: paymentAmount,
          discount: discount,
          order_type: orderType,
          notes: orderNotes.trim() || undefined
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
              status: txn?.status || "PENDING",
              orderType,
              notes: txn?.notes || orderNotes.trim() || null,
              paymentMethod,
              paymentAmount,
              change: paymentAmount - Number(txn?.total_amount ?? total),
              date: formatReceiptDate(),
              cashierName: user?.name || 'Unknown',
              customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in',
              tableName: selectedTable ? selectedTable.name : null
            })
            
            setCart([])
            setSelectedCustomerId("")
            setSelectedTableId("")
            setOrderNotes("")
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
            status: txn?.status || "COMPLETED",
            orderType,
            notes: txn?.notes || orderNotes.trim() || null,
            paymentMethod,
            paymentAmount,
            change: paymentAmount - Number(txn?.total_amount ?? total),
            date: formatReceiptDate(),
            cashierName: user?.name || 'Unknown',
            customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in',
            tableName: selectedTable ? selectedTable.name : null
          })
          setCart([])
          setSelectedCustomerId("")
          setSelectedTableId("")
          setOrderNotes("")
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

  const handleQrisStatusCheck = async () => {
    const transactionNumber = qrisDialogTransaction?.transaction_number || receiptData?.transaction_number
    if (!transactionNumber) return

    setIsQrisChecking(true)
    setNotice(null)

    try {
      const res = await fetch(apiUrl(`/api/qris/status/${transactionNumber}`), {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })
      const data = await res.json()

      if (!res.ok || data.status !== "success") {
        throw new Error(data.message || "Gagal mengecek status QRIS.")
      }

      const transactionStatus = data.transaction_status
      setQrisDialogTransaction((current: any) => current ? { ...current, status: transactionStatus } : current)
      setReceiptData((current: any) => current ? { ...current, status: transactionStatus } : current)

      if (transactionStatus === "COMPLETED") {
        setIsQrisOpen(false)
        setIsReceiptOpen(true)
        setNotice({
          type: "success",
          message: "Pembayaran QRIS sudah terkonfirmasi.",
        })
      } else if (transactionStatus === "CANCELLED") {
        setIsQrisOpen(false)
        setQrisDialogTransaction(null)
        setQrisString(null)
        setNotice({
          type: "info",
          message: "Transaksi QRIS sudah dibatalkan. Stok dan meja sudah dikembalikan.",
        })
      } else {
        setNotice({
          type: "info",
          message: "QRIS masih menunggu pembayaran.",
        })
      }

      fetchProductsAndCustomers()
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal mengecek status QRIS.",
      })
    } finally {
      setIsQrisChecking(false)
    }
  }

  const handleCancelPendingQris = async () => {
    if (!qrisDialogTransaction?.id) return

    setIsQrisCancelling(true)
    setNotice(null)

    try {
      const res = await fetch(apiUrl(`/api/transactions/${qrisDialogTransaction.id}/cancel-pending-qris`), {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`
        }
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || data.error || "Gagal membatalkan transaksi QRIS.")
      }

      setQrisDialogTransaction(data.data)
      setReceiptData((current: any) => current ? { ...current, status: "CANCELLED" } : current)
      setQrisString(null)
      setIsQrisOpen(false)
      setNotice({
        type: "success",
        message: "Transaksi QRIS pending dibatalkan. Stok dan meja sudah dikembalikan.",
      })
      fetchProductsAndCustomers()
    } catch (error: any) {
      setNotice({
        type: "error",
        message: error.message || "Gagal membatalkan transaksi QRIS.",
      })
    } finally {
      setIsQrisCancelling(false)
    }
  }

  const printReceiptElement = (elementId: string) => {
    const receiptWidth = Number(storeSettings.receipt_width || 80)
    const receiptElement = document.getElementById(elementId)

    if (!receiptElement) {
      window.print()
      return
    }

    const previousPrintRoot = document.getElementById("receipt-print-root")
    previousPrintRoot?.remove()

    const printRoot = document.createElement("div")
    printRoot.id = "receipt-print-root"
    printRoot.style.setProperty("--receipt-width", `${receiptWidth}mm`)
    printRoot.style.position = "fixed"
    printRoot.style.left = "-10000px"
    printRoot.style.top = "0"
    printRoot.style.width = `${receiptWidth}mm`

    const receiptCopy = receiptElement.cloneNode(true) as HTMLElement
    receiptCopy.removeAttribute("id")
    receiptCopy.setAttribute("data-receipt-print-copy", "true")
    receiptCopy.style.width = `${receiptWidth}mm`
    receiptCopy.style.minWidth = `${receiptWidth}mm`
    receiptCopy.style.maxWidth = `${receiptWidth}mm`
    receiptCopy.style.margin = "0"
    receiptCopy.style.padding = "3mm"
    receiptCopy.style.boxSizing = "border-box"
    receiptCopy.style.border = "0"
    receiptCopy.style.borderRadius = "0"
    receiptCopy.style.boxShadow = "none"
    printRoot.appendChild(receiptCopy)
    document.body.appendChild(printRoot)

    const receiptHeightPx = receiptCopy.scrollHeight || receiptCopy.getBoundingClientRect().height || 0
    const receiptHeightMm = receiptHeightPx > 0 ? Math.ceil(receiptHeightPx * 25.4 / 96) + 6 : 120
    const printStyleId = "receipt-print-page-size"
    const previousStyle = document.getElementById(printStyleId)
    previousStyle?.remove()

    const printStyle = document.createElement("style")
    printStyle.id = printStyleId
    printStyle.textContent = `@page { size: ${receiptWidth}mm ${receiptHeightMm}mm; margin: 0; }`
    document.head.appendChild(printStyle)
    document.body.classList.add("receipt-printing")
    document.body.style.setProperty("--receipt-width", `${receiptWidth}mm`)

    const removePrintStyle = () => {
      document.body.classList.remove("receipt-printing")
      document.body.style.removeProperty("--receipt-width")
      printStyle.remove()
      printRoot.remove()
      window.removeEventListener("afterprint", removePrintStyle)
    }

    window.addEventListener("afterprint", removePrintStyle)
    window.setTimeout(removePrintStyle, 2000)
    window.print()
  }

  const handlePrint = () => {
    printReceiptElement("printable-receipt")
  }

  const handleKitchenPrint = () => {
    printReceiptElement("printable-kitchen-receipt")
  }

  return (
    <>
    <div className="flex flex-row gap-6 relative h-[calc(100vh-8rem)] w-full overflow-hidden">
      {/* LEFT: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 gap-4 lg:gap-6 overflow-hidden h-full">
        {shiftManagementEnabled && (
          <div className={`shrink-0 rounded-2xl border px-4 py-3 shadow-sm ${
            currentShift
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-900"
          }`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className={`rounded-xl p-2 ${
                  currentShift ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black">
                    {currentShift ? "Shift kasir sedang aktif" : "Shift kasir belum dibuka"}
                  </p>
                  <p className="mt-0.5 text-xs font-semibold opacity-80">
                    {currentShift
                      ? `Dibuka ${formatShiftDate(currentShift.start_time)}. Tutup shift saat sesi kasir selesai dan keranjang sudah kosong.`
                      : "Buka shift sebelum menerima transaksi pertama agar kas dan penjualan tercatat rapi."}
                  </p>
                  {currentShift && (
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-emerald-800">
                        Cash: Rp {formatCurrency(currentShiftCashSales)}
                      </span>
                      <span className="rounded-full bg-white/70 px-2.5 py-1 text-emerald-800">
                        Estimasi laci: Rp {formatCurrency(currentShiftExpectedCash)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              {currentShift ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-emerald-300 bg-white/80 text-emerald-800 hover:bg-white"
                  disabled={cart.length > 0 || isProcessing}
                  onClick={() => openShiftDialog("close")}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Tutup Shift
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="shrink-0 bg-amber-700 text-white hover:bg-amber-800"
                  onClick={() => openShiftDialog("open")}
                >
                  <LogIn className="mr-2 h-4 w-4" />
                  Buka Shift
                </Button>
              )}
            </div>
            {currentShift && cart.length > 0 && (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                Selesaikan atau kosongkan keranjang sebelum menutup shift.
              </p>
            )}
          </div>
        )}

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
                      {product.has_variants ? (
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <div className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wider">
                            {availableVariantCount(product)}/{product.variants?.length || 0} Varian
                          </div>
                          <div className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 rounded-full text-emerald-700 uppercase tracking-wider">
                            Stok: {productStock(product)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500 uppercase tracking-wider">
                          Stok: {product.stock}
                        </div>
                      )}
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
                          className="flex flex-col gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group"
                        >
                          <div className="flex items-center gap-3">
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
                          </div>
                          <Input
                            value={item.notes || ""}
                            onChange={(event) => updateItemNote(item.cart_key, event.target.value)}
                            maxLength={255}
                            placeholder="Catatan item, cth. tanpa gula"
                            className="h-9 rounded-xl border-slate-200 bg-slate-50 text-xs"
                          />
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
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Nomor Meja</label>
                <select
                  className={`w-full h-10 px-3 rounded-xl border bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer ${
                    requiresTable && !selectedTableId ? "border-amber-300" : "border-slate-200"
                  }`}
                  value={selectedTableId}
                  onChange={(e) => {
                    setSelectedTableId(e.target.value)
                    setNotice(null)
                  }}
                  disabled={availableTables.length === 0}
                >
                  <option value="">{availableTables.length === 0 ? "Belum ada meja tersedia" : "Pilih nomor meja"}</option>
                  {availableTables.map(table => (
                    <option key={table.id} value={table.id.toString()}>
                      {table.name}{table.status !== "available" ? ` (${table.status})` : ""}
                    </option>
                  ))}
                </select>
                {tables.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">Belum ada data meja. Tambahkan meja dari menu Manajemen Meja.</p>
                )}
                {tables.length > 0 && availableTables.length === 0 && (
                  <p className="text-xs text-amber-600 font-medium">Semua meja sedang terpakai atau belum tersedia.</p>
                )}
                {requiresTable && !selectedTableId && tables.length > 0 && (
                  <p className="text-xs text-amber-600 font-medium">Nomor meja wajib dipilih untuk pesanan makan di tempat.</p>
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

            <div className="flex flex-col gap-1.5 mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Catatan Order</label>
              <textarea
                value={orderNotes}
                onChange={(event) => setOrderNotes(event.target.value)}
                maxLength={255}
                rows={2}
                placeholder="cth. antar ke meja luar, ambil jam 7"
                className="min-h-16 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
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
                  <AutoDismissNotice notice={notice} onDismiss={() => setNotice(null)} className="mb-3 px-3 py-2" />
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
        {/* Shift Dialog */}
          <Dialog open={isShiftDialogOpen} onOpenChange={setIsShiftDialogOpen}>
            <DialogContent className="!max-w-sm w-[95vw] sm:w-full rounded-2xl">
              <DialogHeader>
                <DialogTitle>
                  {shiftAction === "open" ? "Buka Shift Kasir" : "Tutup Shift Kasir"}
                </DialogTitle>
                <DialogDescription>
                  {shiftAction === "open"
                    ? "Masukkan modal awal sebelum mulai menerima transaksi."
                    : "Masukkan uang aktual di laci kas saat sesi kasir selesai."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                {shiftAction === "close" && currentShift && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-slate-600">Shift dibuka</span>
                      <span className="font-bold text-slate-900">{formatShiftDate(currentShift.start_time)}</span>
                    </div>
                    <div className="mt-1 flex justify-between gap-3">
                      <span className="font-medium text-slate-600">Modal awal</span>
                      <span className="font-bold text-slate-900">Rp {formatCurrency(currentShift.starting_cash)}</span>
                    </div>
                    <div className="mt-1 flex justify-between gap-3">
                      <span className="font-medium text-slate-600">Penjualan cash</span>
                      <span className="font-bold text-slate-900">Rp {formatCurrency(currentShiftCashSales)}</span>
                    </div>
                    <div className="mt-1 flex justify-between gap-3 border-t border-slate-200 pt-2">
                      <span className="font-medium text-slate-600">Estimasi uang laci</span>
                      <span className="font-black text-slate-900">Rp {formatCurrency(currentShiftExpectedCash)}</span>
                    </div>
                  </div>
                )}
                <label className="text-sm font-semibold">
                  {shiftAction === "open" ? "Modal Awal" : "Uang Aktual"}
                </label>
                <Input
                  type="text"
                  placeholder={shiftAction === "open" ? "Misal: 200.000" : "Misal: 1.250.000"}
                  value={shiftCashAmount ? Number(shiftCashAmount).toLocaleString("id-ID") : ""}
                  onChange={(e) => {
                    const rawValue = e.target.value.replace(/\D/g, "")
                    setShiftCashAmount(rawValue)
                  }}
                  className="h-12 rounded-xl text-lg font-bold"
                  autoFocus
                />
                <p className="text-xs font-medium text-muted-foreground">
                  {shiftAction === "open"
                    ? "Buka shift saat kasir mulai bertugas."
                    : "Tutup shift setelah transaksi terakhir selesai."}
                </p>
                {shiftAction === "close" && shiftCashAmount && (
                  <div className={`rounded-xl border px-3 py-2 text-sm font-semibold ${
                    closeShiftDiscrepancy === 0
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : closeShiftDiscrepancy > 0
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-red-200 bg-red-50 text-red-700"
                  }`}>
                    {closeShiftDiscrepancy === 0
                      ? "Uang aktual pas dengan estimasi."
                      : closeShiftDiscrepancy > 0
                        ? `Lebih Rp ${formatCurrency(closeShiftDiscrepancy)} dari estimasi.`
                        : `Kurang Rp ${formatCurrency(Math.abs(closeShiftDiscrepancy))} dari estimasi.`}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  className="rounded-xl font-semibold"
                  onClick={() => setIsShiftDialogOpen(false)}
                  disabled={isShiftProcessing}
                >
                  Batal
                </Button>
                <Button
                  className="rounded-xl font-bold"
                  onClick={handleShiftSubmit}
                  disabled={isShiftProcessing}
                >
                  {isShiftProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : shiftAction === "open" ? (
                    "Buka Shift"
                  ) : (
                    "Tutup Shift"
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
                {(variantProduct?.variants || []).map((variant: any) => {
                  const stock = Number(variant.stock || 0)
                  const isAvailable = stock > 0

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={!isAvailable}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-70"
                      onClick={() => {
                        addToCart(buildCartItem(variantProduct, variant))
                        setVariantProduct(null)
                      }}
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{variant.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                          {variant.sku && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{variant.sku}</span>
                          )}
                          <span className={`rounded-full px-2 py-0.5 ${isAvailable ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                            {isAvailable ? `Stok ${stock}` : "Habis"}
                          </span>
                        </div>
                      </div>
                      <div className={`shrink-0 text-right font-black ${isAvailable ? "text-primary" : "text-slate-400"}`}>
                        Rp {variantPrice(variantProduct, variant).toLocaleString("id-ID")}
                      </div>
                    </button>
                  )
                })}
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
                  <p className={`text-xs font-medium ${
                    qrisDialogTransaction?.status === "COMPLETED"
                      ? "text-emerald-600"
                      : qrisDialogTransaction?.status === "CANCELLED"
                        ? "text-red-600"
                        : "text-blue-600"
                  }`}>
                    Status transaksi: {qrisDialogTransaction?.status === "COMPLETED"
                      ? "terkonfirmasi"
                      : qrisDialogTransaction?.status === "CANCELLED"
                        ? "dibatalkan"
                        : "menunggu pembayaran"}
                  </p>
                </div>
              </div>
              <DialogFooter className="grid gap-2 sm:grid-cols-2">
                <Button
                  className="h-12 text-sm font-bold rounded-xl"
                  onClick={handleQrisStatusCheck}
                  disabled={isQrisChecking || isQrisCancelling}
                >
                  {isQrisChecking ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Cek Status
                </Button>
                <Button
                  variant="outline"
                  className="h-12 text-sm font-bold rounded-xl"
                  onClick={() => {
                    setIsQrisOpen(false)
                    setIsReceiptOpen(true)
                  }}
                  disabled={!receiptData || isQrisChecking || isQrisCancelling}
                >
                  Cetak Struk Pending
                </Button>
                <Button
                  variant="destructive"
                  className="h-12 text-sm font-bold rounded-xl"
                  onClick={handleCancelPendingQris}
                  disabled={!qrisDialogTransaction?.id || qrisDialogTransaction?.status !== "PENDING" || isQrisChecking || isQrisCancelling}
                >
                  {isQrisCancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Batalkan QRIS
                </Button>
                <Button 
                  variant="outline"
                  className="h-12 text-sm font-bold rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98]"
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
            <DialogContent className="flex h-[min(92dvh,860px)] !max-w-[min(96vw,440px)] w-[96vw] max-h-[calc(100dvh-1rem)] flex-col gap-0 overflow-hidden rounded-2xl p-0">
              <div className="shrink-0 px-5 pt-5 pb-3 text-center sm:pt-6">
                <motion.div 
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 sm:mb-4 sm:h-16 sm:w-16"
                >
                  <CheckCircle2 className="h-7 w-7 sm:h-10 sm:w-10" />
                </motion.div>
                <h2 className="text-xl font-black text-default-900 sm:text-2xl">
                  {receiptData?.status === "PENDING" ? "Menunggu Pembayaran" : "Pembayaran Berhasil!"}
                </h2>
                <p className="mt-1 text-sm text-default-500 sm:text-base">
                  {receiptData?.status === "PENDING" ? "Simpan struk sampai QRIS terkonfirmasi." : "Transaksi telah tersimpan."}
                </p>
              </div>

              {/* Printable Receipt Area */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-3 sm:px-5">
                <div
                  id="printable-receipt"
                  style={{ "--receipt-width": `${Number(storeSettings.receipt_width || 80)}mm` } as CSSProperties}
                  className="receipt-paper bg-white text-black text-[13px] sm:text-sm print:text-[10px] font-mono flex max-w-full flex-col gap-2 rounded-xl border shadow-sm mx-auto mb-2 p-4 sm:p-5 print:m-0"
                >
                  <div className="receipt-text text-center font-black text-lg print:text-[13px] leading-tight">
                    {storeSettings.receipt_header || storeSettings.name || 'BadakBizz'}
                  </div>
                  <div className="receipt-text text-center text-xs print:text-[9px] leading-snug font-normal text-gray-600 print:text-black">
                    {storeSettings.address || 'Alamat Toko'}<br />
                    Telp: {storeSettings.phone || '-'}
                  </div>

                  {receiptData?.status === "PENDING" && (
                    <div className="receipt-status rounded-lg px-2 py-1 text-xs print:rounded-none print:text-[9px]">
                      STATUS: MENUNGGU PEMBAYARAN
                    </div>
                  )}

                  <div className="receipt-section space-y-1 text-xs font-medium text-gray-600 print:text-[9px] print:text-black">
                    <div className="receipt-row">
                      <span>No</span>
                      <span className="receipt-value receipt-text">{receiptData?.transaction_number}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Tanggal</span>
                      <span className="receipt-value receipt-text">{receiptData?.date}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Kasir</span>
                      <span className="receipt-value receipt-text">{receiptData?.cashierName}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Pelanggan</span>
                      <span className="receipt-value receipt-text">{receiptData?.customerName}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Order</span>
                      <span className="receipt-value receipt-text">{receiptData?.orderType === "dine_in" ? "Dine-in" : "Takeaway"}</span>
                    </div>
                    {receiptData?.tableName && (
                      <div className="receipt-row">
                      <span>Meja</span>
                      <span className="receipt-value receipt-text">{receiptData.tableName}</span>
                      </div>
                    )}
                    {receiptData?.notes && (
                      <div className="receipt-row">
                        <span>Catatan</span>
                        <span className="receipt-value receipt-text">{receiptData.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className="receipt-section flex flex-col gap-2">
                    {receiptData?.items.map((item: any, i: number) => {
                      const itemParts = getReceiptItemParts(item)
                      return (
                      <div key={i} className="receipt-item flex flex-col gap-0.5">
                        <div className="receipt-item-name print:text-black">
                          {itemParts.name}
                        </div>
                        {itemParts.variantName && (
                          <div className="receipt-item-meta">Varian: {itemParts.variantName}</div>
                        )}
                        {item.notes && (
                          <div className="receipt-item-meta">Catatan: {item.notes}</div>
                        )}
                        <div className="receipt-row text-xs text-gray-500 print:text-[9px] print:text-black">
                          <span>{item.qty} x Rp {formatCurrency(item.selling_price)}</span>
                          <span className="receipt-value receipt-money">Rp {formatCurrency(item.selling_price * item.qty)}</span>
                        </div>
                      </div>
                    )})}
                  </div>

                  <div className="receipt-section space-y-1">
                    <div className="receipt-row text-xs print:text-[9px] print:text-black">
                      <span>Subtotal</span>
                      <span className="receipt-value receipt-money">Rp {formatCurrency(receiptData?.subtotal)}</span>
                    </div>
                    {receiptData?.discount > 0 && (
                      <div className="receipt-row text-xs print:text-[9px] print:text-black">
                        <span>Diskon</span>
                        <span className="receipt-value receipt-money">- Rp {formatCurrency(receiptData?.discount)}</span>
                      </div>
                    )}
                    {receiptData?.service_charge > 0 && (
                      <div className="receipt-row text-xs print:text-[9px] print:text-black">
                        <span className="receipt-text">Service Charge ({storeSettings.service_charge_rate}%)</span>
                        <span className="receipt-value receipt-money">Rp {formatCurrency(receiptData?.service_charge)}</span>
                      </div>
                    )}
                    <div className="receipt-row text-xs print:text-[9px] print:text-black">
                      <span>Tax ({storeSettings.tax_rate}%)</span>
                      <span className="receipt-value receipt-money">Rp {formatCurrency(receiptData?.tax)}</span>
                    </div>
                  </div>

                  <div className="receipt-section receipt-row font-black text-lg print:text-[12px] print:text-black">
                    <span>TOTAL</span>
                    <span className="receipt-value receipt-money">Rp {formatCurrency(receiptData?.total)}</span>
                  </div>

                  <div className="space-y-1 text-xs print:text-[9px] print:text-black">
                    <div className="receipt-row">
                      <span>Metode</span>
                      <span className="receipt-value receipt-text">{receiptData?.paymentMethod}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Bayar</span>
                      <span className="receipt-value receipt-money">Rp {formatCurrency(receiptData?.paymentAmount)}</span>
                    </div>
                    {receiptData?.status !== "PENDING" && (
                      <div className="receipt-row">
                        <span>Kembali</span>
                        <span className="receipt-value receipt-money font-bold">Rp {formatCurrency(receiptData?.change)}</span>
                      </div>
                    )}
                  </div>

                  <div className="receipt-section receipt-text text-center text-xs print:text-[9px] italic text-gray-500 print:text-black">
                    {receiptData?.status === "PENDING" && (
                      <div className="mb-1 font-bold not-italic">
                        Struk ini belum menjadi bukti pembayaran lunas.
                      </div>
                    )}
                    {storeSettings.receipt_footer || 'Terima kasih atas kunjungan Anda!'}
                  </div>

                  <div className="print:hidden border-t border-dashed mt-4 pt-4 text-center text-xs text-muted-foreground">
                    Ini adalah pratinjau struk yang akan dicetak.
                  </div>
                </div>

                {kitchenReceiptsEnabled && receiptData?.status !== "PENDING" && (
                  <div
                    id="printable-kitchen-receipt"
                    style={{ "--receipt-width": `${Number(storeSettings.receipt_width || 80)}mm` } as CSSProperties}
                    className="receipt-paper mt-3 bg-white text-black text-[13px] sm:text-sm print:text-[10px] font-mono flex max-w-full flex-col gap-3 rounded-xl border shadow-sm mx-auto mb-2 p-4 sm:p-5 print:m-0"
                  >
                    <div className="receipt-section text-center">
                      <div className="receipt-text font-black text-xl leading-tight print:text-[15px]">
                        TIKET DAPUR
                      </div>
                      <div className="receipt-text mt-1 text-xs font-bold uppercase print:text-[9px]">
                        {receiptData?.orderType === "dine_in" ? "DINE-IN" : "TAKEAWAY"}
                        {receiptData?.tableName ? ` / ${receiptData.tableName}` : ""}
                      </div>
                      <div className="receipt-text mt-1 text-xs text-gray-600 print:text-[9px] print:text-black">
                        {storeSettings.name || "BadakBizz"}
                      </div>
                    </div>

                    <div className="receipt-section space-y-1 text-xs font-medium text-gray-700 print:text-[9px] print:text-black">
                      <div className="receipt-row">
                        <span>No</span>
                        <span className="receipt-value receipt-text font-black">{receiptData?.transaction_number}</span>
                      </div>
                      <div className="receipt-row">
                        <span>Waktu</span>
                        <span className="receipt-value receipt-text">{receiptData?.date}</span>
                      </div>
                    </div>

                    {receiptData?.notes && (
                      <div className="receipt-section rounded-md border border-dashed border-black/50 p-2 print:rounded-none">
                        <div className="receipt-text text-[10px] font-black uppercase print:text-[8px]">Catatan Order</div>
                        <div className="receipt-text mt-1 text-sm font-bold leading-snug print:text-[10px]">
                          {receiptData.notes}
                        </div>
                      </div>
                    )}

                    <div className="receipt-section flex flex-col gap-3">
                      {receiptData?.items.map((item: any, i: number) => {
                        const itemParts = getReceiptItemParts(item)
                        return (
                          <div key={i} className="receipt-item flex flex-col gap-1">
                            <div className="receipt-row items-start font-black text-base print:text-[12px] print:text-black">
                              <span className="receipt-item-name">{i + 1}. {itemParts.name}</span>
                              <span className="receipt-value ml-2 rounded border border-black px-2 py-0.5 text-base print:text-[12px]">
                                {item.qty}x
                              </span>
                            </div>
                            {itemParts.variantName && (
                              <div className="receipt-item-meta font-bold">Varian: {itemParts.variantName}</div>
                            )}
                            {item.notes && (
                              <div className="receipt-item-meta rounded bg-gray-100 px-2 py-1 font-bold print:bg-white print:px-0">
                                Catatan: {item.notes}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <div className="print:hidden border-t border-dashed mt-4 pt-4 text-center text-xs text-muted-foreground">
                      Tiket dapur tidak menyertakan harga.
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="!mx-0 !mb-0 shrink-0 border-t px-5 py-3 sm:justify-between sm:py-4">
                <Button variant="outline" className="rounded-xl font-semibold" onClick={() => setIsReceiptOpen(false)}>
                  Tutup
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  {kitchenReceiptsEnabled && receiptData?.status !== "PENDING" && (
                    <Button variant="outline" onClick={handleKitchenPrint} className="rounded-xl font-bold">
                      Cetak Tiket Dapur
                    </Button>
                  )}
                  <Button onClick={handlePrint} className="rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800">
                    Cetak Struk
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      
      
    </>
  )
}
