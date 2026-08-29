"use client"

import { apiUrl } from "@/lib/api"
import React, { useState, useEffect } from "react"
import { Package, ArrowRightLeft, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RestockDialog } from "./restock-dialog"
import { useAuth } from "@/context/AuthContext"

export default function InventoryPage() {
  const { token } = useAuth()
  const [products, setProducts] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  
  const [stockPage, setStockPage] = useState(1)
  const [totalStockPages, setTotalStockPages] = useState(1)
  
  const [movementPage, setMovementPage] = useState(1)
  const [totalMovementPages, setTotalMovementPages] = useState(1)

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const headers = { "Authorization": `Bearer ${token}` }
      const [productsRes, movementsRes] = await Promise.all([
        fetch(apiUrl(`/api/products?page=${stockPage}&per_page=10`), { headers }),
        fetch(apiUrl(`/api/inventory/movements?page=${movementPage}&per_page=10`), { headers })
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
    } catch (error) {
      console.error("Error fetching inventory data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      fetchData()
    }
  }, [token, stockPage, movementPage])

  const lowStockCount = products.filter((p: any) => p.stock <= p.minimum_stock).length

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Stok Gudang</h1>
        <p className="text-muted-foreground">Kelola ketersediaan barang dan riwayat mutasi.</p>
      </div>

      {lowStockCount > 0 && (
        <Card className="bg-red-50 border-red-200 shadow-none">
          <CardContent className="flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div className="flex-1">
              <h3 className="font-semibold text-sm text-red-800">Peringatan Stok Menipis!</h3>
              <p className="text-sm text-red-600/90">Ada {lowStockCount} produk yang stoknya hampir habis. Segera lakukan restock.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="stock" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Daftar Stok
          </TabsTrigger>
          <TabsTrigger value="movements" className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4" />
            Riwayat Mutasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
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
                        const isLowStock = product.stock <= product.minimum_stock
                        return (
                          <tr key={product.id} className="border-b last:border-0 hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-900">{product.name}</div>
                              <div className="text-slate-500 text-xs">{product.sku}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-700">{product.stock}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {product.minimum_stock}
                            </td>
                            <td className="px-4 py-3">
                              {isLowStock ? (
                                <Badge variant="destructive" className="font-normal flex items-center gap-1 w-fit">
                                  <AlertTriangle className="w-3 h-3" /> Menipis
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 font-normal flex items-center gap-1 w-fit">
                                  <CheckCircle2 className="w-3 h-3" /> Aman
                                </Badge>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <RestockDialog product={product} />
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

        <TabsContent value="movements">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 font-medium text-slate-500">TANGGAL & WAKTU</th>
                      <th className="px-4 py-3 font-medium text-slate-500">PRODUK</th>
                      <th className="px-4 py-3 font-medium text-slate-500">JENIS</th>
                      <th className="px-4 py-3 font-medium text-slate-500">JUMLAH</th>
                      <th className="px-4 py-3 font-medium text-slate-500">KETERANGAN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
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
                            <div className="text-slate-500 text-xs">{movement.sku}</div>
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
                              {movement.type === 'IN' ? '+' : '-'}{movement.quantity}
                            </span>
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
