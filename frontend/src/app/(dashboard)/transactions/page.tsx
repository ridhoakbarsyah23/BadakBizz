"use client"

import React, { useState, useEffect } from "react"
import { 
  Button, 
  Input,
  Chip
} from "@heroui/react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Filter, Printer, Loader2, Eye } from "lucide-react"

interface TransactionItem {
  id: number
  product_id: number
  quantity: number
  price: string
  subtotal: string
  product: {
    id: number
    name: string
    sku: string
  }
}

interface Transaction {
  id: number
  transaction_number: string
  customer_id: number | null
  cashier_id: number | null
  subtotal: string
  tax: string
  discount: string
  total_amount: string
  payment_amount: string
  payment_method: string
  status: string
  created_at: string
  customer?: {
    id: number
    name: string
  }
  items: TransactionItem[]
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const fetchData = async () => {
    try {
      setIsLoading(true)
      const res = await fetch('http://localhost:8000/api/transactions')
      if (!res.ok) throw new Error('Failed to fetch data')
      const data = await res.json()
      setTransactions(data)
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredTransactions = transactions.filter(trx => 
    trx.transaction_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (trx.customer?.name && trx.customer.name.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage all sales transactions.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
          <Input
            type="search"
            placeholder="Search by receipt number..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" inline-block="true" />
          Filter Date
        </Button>
      </div>

      <div className="bg-background rounded-xl border border-default-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>RECEIPT NO</TableHead>
                <TableHead>DATE & TIME</TableHead>
                <TableHead>CUSTOMER</TableHead>
                <TableHead>PAYMENT</TableHead>
                <TableHead>TOTAL</TableHead>
                <TableHead>STATUS</TableHead>
                <TableHead className="text-right">ACTION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-default-500">
                    No transactions found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((trx) => (
                  <TableRow key={trx.id}>
                    <TableCell className="py-3 px-4 font-medium">{trx.transaction_number}</TableCell>
                    <TableCell className="py-3 px-4">{formatDate(trx.created_at)}</TableCell>
                    <TableCell className="py-3 px-4">{trx.customer?.name || '-'}</TableCell>
                    <TableCell className="py-3 px-4">{trx.payment_method}</TableCell>
                    <TableCell className="py-3 px-4 font-medium text-primary">Rp {Number(trx.total_amount).toLocaleString('id-ID')}</TableCell>
                    <TableCell className="py-3 px-4">
                      <Chip 
                        color={trx.status === 'COMPLETED' ? 'success' : trx.status === 'CANCELLED' ? 'danger' : 'warning'} 
                        variant="soft" 
                        size="sm"
                      >
                        {trx.status}
                      </Chip>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <div className="flex justify-end gap-2">
                        <Button isIconOnly variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button isIconOnly variant="ghost" size="sm">
                          <Printer className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
