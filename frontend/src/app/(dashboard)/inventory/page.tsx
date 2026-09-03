"use client"

import { apiUrl } from "@/lib/api"
import { AutoDismissNotice } from "@/components/auto-dismiss-notice"
import React, { useState, useEffect } from "react"
import { Package, ArrowRightLeft, AlertTriangle, CheckCircle2, Loader2, Search, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdjustStockDialog } from "./adjust-stock-dialog"
import { RestockDialog } from "./restock-dialog"
import { useAuth } from "@/context/AuthContext"

export default function InventoryPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [stockPage, setStockPage] = useState(1)
  const [totalStockPages, setTotalStockPages] = useState(1)
  const [stockFilter, setStockFilter] = useState("ALL")
  const [stockSearch, setStockSearch] = useState("")
  
  const [movementPage, setMovementPage] = useState(1)
  const [totalMovementPages, setTotalMovementPages] = useState(1)
  const [movementType, setMovementType] = useState("ALL")
  const [movementSearch, setMovementSearch] = useState("")
  const [movementStartDate, setMovementStartDate] = useState("")
  const [movementEndDate, setMovementEndDate] = useState("")
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info"
    message: string
  } | null>(null)
  const [activeTab, setActiveTab] = useState("stock")

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const headers = { "Authorization": `Bearer ${token}` }
      const stockParams = new URLSearchParams({
        page: stockPage.toString(),
        per_page: "10",
      })
      const movementParams = new URLSearchParams({
        page: movementPage.toString(),
        per_page: "10",
      })

      if (stockFilter !== "ALL") stockParams.set("stock_status", stockFilter)
      if (stockSearch.trim()) stockParams.set("search", stockSearch.trim())
      if (movementType !== "ALL") movementParams.set("type", movementType)
      if (movementSearch.trim()) movementParams.set("search", movementSearch.trim())
      if (movementStartDate) movementParams.set("start_date", movementStartDate)
      if (movementEndDate) movementParams.set("end_date", movementEndDate)

      const [productsRes, movementsRes] = await Promise.all([
        fetch(apiUrl(`/api/products?${stockParams.toString()}`), { headers }),
        fetch(apiUrl(`/api/inventory/movements?${movementParams.toString()}`), { headers })
      ])
      
      const prodData = productsRes.ok ? await productsRes.json() : null
      const movData = movementsRes.ok ? await movementsRes.json() : null

      if (prodData && prodData.data) {
        setProducts(prodData.data)
        setTotalStockPages(prodData.last_page || 1)
      } else {
        setProducts(Array.isArray(prodData) ? prodData : [])
        setTotalStockPages(1)
      }

      if (movData && movData.data) {
        setMovements(movData.data)
        setTotalMovementPages(movData.last_page || 1)
      } else {
        setMovements(Array.isArray(movData) ? movData : [])
        setTotalMovementPages(1)
      }
    } catch {
      setProducts([])
      setMovements([])
      setTotalStockPages(1)
      setTotalMovementPages(1)
      setNotice({
        type: "error",
        message: "Tidak dapat terhubung ke server. Pastikan backend sedang berjalan.",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, stockPage, stockFilter, stockSearch, movementPage, movementType, movementSearch, movementStartDate, movementEndDate])

  const productStock = (product: any) => Number(product.current_stock ?? (
    product.has_variants
      ? (product.variants || []).reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0)
      : Number(product.stock || 0)
  ))

  const stockStatus = (product: any) => product.stock_status || (
    productStock(product) <= 0 ? "out" : productStock(product) <= product.minimum_stock ? "low" : "safe"
  )
  const lowStockCount = products.filter((product: any) => stockStatus(product) === "low").length
  const outStockCount = products.filter((product: any) => stockStatus(product) === "out").length
  const hasStockFilters = stockFilter !== "ALL" || stockSearch.trim()
  const hasMovementFilters = movementType !== "ALL" || movementSearch.trim() || movementStartDate || movementEndDate

  const resetStockFilters = () => {
    setStockFilter("ALL")
    setStockSearch("")
    setStockPage(1)
  }

  const resetMovementFilters = () => {
    setMovementType("ALL")
    setMovementSearch("")
    setMovementStartDate("")
    setMovementEndDate("")
    setMovementPage(1)
  }

  const handleRestocked = async (product: any, quantity: number) => {
    await fetchData()
    setActiveTab("movements")
    setNotice({
      type: "success",
      message: `Stok ${product.name} berhasil ditambahkan sebanyak ${quantity.toLocaleString("id-ID")}.`,
    })
  }

  const handleAdjusted = async (product: any, difference: number) => {
    await fetchData()
    setActiveTab("movements")
    setNotice({
      type: "success",
      message: `Stok ${product.name} berhasil disesuaikan (${difference > 0 ? "+" : ""}${difference.toLocaleString("id-ID")}).`,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-6">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">Stok Gudang</h1>
        <p className="text-muted-foreground">Kelola ketersediaan barang dan riwayat mutasi.</p>
      </div>

      <AutoDismissNotice notice={notice} onDismiss={() => setNotice(null)} />

      {(lowStockCount > 0 || outStockCount > 0) && (
        <Card className="bg-red-50 border-red-200 shadow-none">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-red-800">Peringatan Stok</h3>
              <p className="text-sm text-red-600/90">
                {outStockCount} produk habis dan {lowStockCount} produk menipis.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-w-0 w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 sm:w-fit">
          <TabsTrigger value="stock" className="flex min-w-0 items-center gap-2">
            <Package className="w-4 h-4" />
            Daftar Stok
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex min-w-0 items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Riwayat Mutasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="min-w-0">
          <Card>
            <CardContent className="p-0">
              <div className="grid min-w-0 gap-3 border-b p-4 sm:grid-cols-[170px_1fr] xl:grid-cols-[170px_1fr_auto]">
                <select
                  className="h-8 min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm"
                  value={stockFilter}
                  onChange={(event) => {
                    setStockFilter(event.target.value)
                    setStockPage(1)
                  }}
                >
                  <option value="ALL">Semua Status</option>
                  <option value="out">Stok Habis</option>
                  <option value="low">Stok Menipis</option>
                  <option value="safe">Stok Aman</option>
                </select>
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-8"
                    placeholder="Cari produk, SKU, barcode, atau varian"
                    value={stockSearch}
                    onChange={(event) => {
                      setStockSearch(event.target.value)
                      setStockPage(1)
                    }}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full sm:col-span-2 xl:col-span-1 xl:w-auto"
                  onClick={resetStockFilters}
                  disabled={!hasStockFilters}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reset
                </Button>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-500">SKU / PRODUK</th>
                      <th className="px-4 py-3 font-medium text-slate-500">STOK AKTUAL</th>
                      <th className="px-4 py-3 font-medium text-slate-500">BATAS MINIMUM</th>
                      <th className="px-4 py-3 font-medium text-slate-500">STATUS</th>
                      <th className="px-4 py-3 font-medium text-slate-500 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          Belum ada produk terdaftar.
                        </td>
                      </tr>
                    ) : (
                      products.map((product: any) => {
                        const stock = productStock(product)
                        const status = stockStatus(product)
                        return (
                          <tr key={product.id} className="border-b last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{product.name}</div>
                              <div className="text-slate-500 text-xs">{product.sku}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-700">{stock}</span>
                              {product.has_variants && (
                                <div className="text-xs text-slate-500">Total dari {product.variants?.length || 0} varian</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {product.minimum_stock}
                            </td>
                            <td className="px-4 py-3">
                              {status === "out" ? (
                                <Badge variant="destructive" className="font-normal flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" /> Habis
                                </Badge>
                              ) : status === "low" ? (
                                <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100 font-normal flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" /> Menipis
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 font-normal flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" /> Aman
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <RestockDialog product={product} onRestocked={(quantity) => handleRestocked(product, quantity)} />
                                <AdjustStockDialog product={product} onAdjusted={handleAdjusted} />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {!isLoading && totalStockPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <button 
                    onClick={() => setStockPage(prev => Math.max(prev - 1, 1))}
                    disabled={stockPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm text-slate-500">
                    Halaman {stockPage} dari {totalStockPages}
                  </span>
                  <button 
                    onClick={() => setStockPage(prev => Math.min(prev + 1, totalStockPages))}
                    disabled={stockPage === totalStockPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="movements" className="min-w-0">
          <Card>
            <CardContent className="p-0">
              <div className="grid min-w-0 gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-[160px_minmax(220px,1fr)_150px_150px_auto]">
                <select
                  className="h-8 min-w-0 rounded-lg border border-input bg-background px-2.5 text-sm"
                  value={movementType}
                  onChange={(event) => {
                    setMovementType(event.target.value)
                    setMovementPage(1)
                  }}
                >
                  <option value="ALL">Semua Jenis</option>
                  <option value="IN">Masuk</option>
                  <option value="OUT">Keluar</option>
                  <option value="ADJUSTMENT">Penyesuaian</option>
                </select>
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-2.5 top-2 h-4 w-4 text-slate-400" />
                  <Input
                    className="pl-8"
                    placeholder="Cari produk, SKU, varian, user, catatan"
                    value={movementSearch}
                    onChange={(event) => {
                      setMovementSearch(event.target.value)
                      setMovementPage(1)
                    }}
                  />
                </div>
                <Input
                  type="date"
                  value={movementStartDate}
                  onChange={(event) => {
                    setMovementStartDate(event.target.value)
                    setMovementPage(1)
                  }}
                />
                <Input
                  type="date"
                  value={movementEndDate}
                  onChange={(event) => {
                    setMovementEndDate(event.target.value)
                    setMovementPage(1)
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full sm:col-span-2 xl:col-span-1 xl:w-auto"
                  onClick={resetMovementFilters}
                  disabled={!hasMovementFilters}
                >
                  <X className="mr-1 h-4 w-4" />
                  Reset
                </Button>
              </div>
              <div className="max-w-full overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-500">TANGGAL & WAKTU</th>
                      <th className="px-4 py-3 font-medium text-slate-500">PRODUK</th>
                      <th className="px-4 py-3 font-medium text-slate-500">JENIS</th>
                      <th className="px-4 py-3 font-medium text-slate-500">JUMLAH</th>
                      <th className="px-4 py-3 font-medium text-slate-500">USER</th>
                      <th className="px-4 py-3 font-medium text-slate-500">KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                          Belum ada riwayat mutasi stok.
                        </td>
                      </tr>
                    ) : (
                      movements.map((movement: any) => (
                        <tr key={movement.id} className="border-b last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                            {new Date(movement.created_at).toLocaleString('id-ID', {
                              day: '2-digit', month: 'short', year: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">{movement.product_name}</div>
                            <div className="text-slate-500 text-xs">
                              {movement.variant_name
                                ? `${movement.sku} / ${movement.variant_name}${movement.variant_sku ? ` - ${movement.variant_sku}` : ""}`
                                : movement.sku}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {movement.type === 'IN' ? (
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none font-semibold">MASUK</Badge>
                            ) : movement.type === 'OUT' ? (
                              <Badge variant="destructive" className="font-semibold">KELUAR</Badge>
                            ) : (
                              <Badge variant="secondary" className="font-semibold bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-none">PENYESUAIAN</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-slate-700">
                              {movement.type === 'IN'
                                ? `+${movement.quantity}`
                                : movement.type === 'OUT'
                                  ? `-${movement.quantity}`
                                  : Number(movement.quantity) > 0
                                    ? `+${movement.quantity}`
                                    : movement.quantity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {movement.user_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {movement.notes || '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {!isLoading && totalMovementPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t">
                  <button 
                    onClick={() => setMovementPage(prev => Math.max(prev - 1, 1))}
                    disabled={movementPage === 1}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm text-slate-500">
                    Halaman {movementPage} dari {totalMovementPages}
                  </span>
                  <button 
                    onClick={() => setMovementPage(prev => Math.min(prev + 1, totalMovementPages))}
                    disabled={movementPage === totalMovementPages}
                    className="px-3 py-1 border rounded text-sm disabled:opacity-50"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
