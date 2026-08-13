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
import { Search, Filter, Printer } from "lucide-react"

export default function TransactionsPage() {
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
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by receipt number..."
            className="pl-8"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" /> Filter Date
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Receipt No</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">KVO-20260813-0001</TableCell>
              <TableCell>13 Aug 2026, 10:24</TableCell>
              <TableCell>Budi Santoso</TableCell>
              <TableCell>QRIS</TableCell>
              <TableCell>Rp 45.000</TableCell>
              <TableCell><Badge>Completed</Badge></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon">
                  <Printer className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">KVO-20260813-0002</TableCell>
              <TableCell>13 Aug 2026, 11:05</TableCell>
              <TableCell>-</TableCell>
              <TableCell>Cash</TableCell>
              <TableCell>Rp 18.000</TableCell>
              <TableCell><Badge variant="destructive">Cancelled</Badge></TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" disabled>
                  <Printer className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
