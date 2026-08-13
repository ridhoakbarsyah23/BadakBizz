import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, Search, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal } from "lucide-react"

export default function InventoryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Manage stock movements (In, Out, Adjustments).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-green-600 border-green-200 hover:bg-green-50">
            <ArrowDownToLine className="mr-2 h-4 w-4" /> Stock In
          </Button>
          <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
            <ArrowUpFromLine className="mr-2 h-4 w-4" /> Stock Out
          </Button>
          <Button>
            <SlidersHorizontal className="mr-2 h-4 w-4" /> Adjustment
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products or SKU..."
            className="pl-8"
          />
        </div>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Notes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>13 Aug 2026, 08:30</TableCell>
              <TableCell className="font-medium">Kopi Susu Aren</TableCell>
              <TableCell>KV-001</TableCell>
              <TableCell><Badge className="bg-green-500">IN</Badge></TableCell>
              <TableCell className="text-green-600 font-bold">+50</TableCell>
              <TableCell className="text-muted-foreground">Restock dari supplier kopi</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>12 Aug 2026, 19:15</TableCell>
              <TableCell className="font-medium">Indomie Telur</TableCell>
              <TableCell>KV-004</TableCell>
              <TableCell><Badge variant="destructive">OUT</Badge></TableCell>
              <TableCell className="text-red-600 font-bold">-2</TableCell>
              <TableCell className="text-muted-foreground">Barang rusak (expired)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>12 Aug 2026, 10:00</TableCell>
              <TableCell className="font-medium">Roti Bakar Coklat</TableCell>
              <TableCell>KV-002</TableCell>
              <TableCell><Badge variant="outline" className="text-blue-600 border-blue-200">ADJUST</Badge></TableCell>
              <TableCell className="text-blue-600 font-bold">1</TableCell>
              <TableCell className="text-muted-foreground">Penyesuaian stok opname</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
