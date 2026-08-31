<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $startDateStr = $request->query('start_date');
        $endDateStr = $request->query('end_date');

        if ($startDateStr && $endDateStr) {
            $startDate = Carbon::parse($startDateStr)->startOfDay();
            $endDate = Carbon::parse($endDateStr)->endOfDay();
        } else {
            // Default to Year-to-Date if no dates provided
            $startDate = Carbon::now()->startOfYear();
            $endDate = Carbon::now()->endOfDay();
        }

        // 1. Total Revenue
        $totalRevenue = Transaction::where('status', 'COMPLETED')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->sum('total_amount');

        // 2. Average Transaction
        $averageTransaction = Transaction::where('status', 'COMPLETED')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->avg('total_amount') ?? 0;

        // 3. Top Selling Item
        $topSellingItem = DB::table('transaction_items')
            ->join('products', 'transaction_items.product_id', '=', 'products.id')
            ->join('transactions', 'transaction_items.transaction_id', '=', 'transactions.id')
            ->where('transactions.status', 'COMPLETED')
            ->whereBetween('transactions.created_at', [$startDate, $endDate])
            ->select('products.name', DB::raw('SUM(transaction_items.quantity) as total_sold'))
            ->groupBy('products.id', 'products.name')
            ->orderBy('total_sold', 'DESC')
            ->first();

        // 4. Busiest Hour
        $transactionsTime = Transaction::select('created_at')
            ->where('status', 'COMPLETED')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $busiestHourData = $transactionsTime->groupBy(function ($date) {
            return Carbon::parse($date->created_at)->format('H');
        })->map(function ($row) {
            return $row->count();
        })->sortDesc()->keys()->first();

        $busiestHour = $busiestHourData ? $busiestHourData.':00 - '.str_pad((int) $busiestHourData + 1, 2, '0', STR_PAD_LEFT).':00' : 'N/A';

        // 5. Chart Data
        $diffInDays = $startDate->diffInDays($endDate);

        $chartTransactions = Transaction::with('items.product')
            ->where('status', 'COMPLETED')
            ->whereBetween('created_at', [$startDate, $endDate])
            ->get();

        $chartData = collect([]);

        if ($diffInDays <= 31) {
            // Daily Chart
            $period = CarbonPeriod::create($startDate, $endDate);
            foreach ($period as $date) {
                $dateKey = $date->format('Y-m-d');
                $dateLabel = $date->format('d M');

                $txsInDay = $chartTransactions->filter(function ($t) use ($dateKey) {
                    return Carbon::parse($t->created_at)->format('Y-m-d') === $dateKey;
                });

                $sales = $txsInDay->sum('total_amount');
                $profit = 0;
                foreach ($txsInDay as $tx) {
                    foreach ($tx->items as $item) {
                        $purchasePrice = $item->product ? $item->product->purchase_price : 0;
                        $profit += ($item->price - $purchasePrice) * $item->quantity;
                    }
                }

                $chartData->push([
                    'label' => $dateLabel,
                    'sales' => $sales,
                    'profit' => $profit,
                ]);
            }
        } else {
            // Monthly Chart
            $period = CarbonPeriod::create($startDate->copy()->startOfMonth(), '1 month', $endDate->copy()->startOfMonth());
            foreach ($period as $date) {
                $monthKey = $date->format('Y-m');
                $monthLabel = $date->format('M Y');

                $txsInMonth = $chartTransactions->filter(function ($t) use ($monthKey) {
                    return Carbon::parse($t->created_at)->format('Y-m') === $monthKey;
                });

                $sales = $txsInMonth->sum('total_amount');
                $profit = 0;
                foreach ($txsInMonth as $tx) {
                    foreach ($tx->items as $item) {
                        $purchasePrice = $item->product ? $item->product->purchase_price : 0;
                        $profit += ($item->price - $purchasePrice) * $item->quantity;
                    }
                }

                $chartData->push([
                    'label' => $monthLabel,
                    'sales' => $sales,
                    'profit' => $profit,
                ]);
            }
        }

        return response()->json([
            'totalRevenue' => $totalRevenue,
            'averageTransaction' => $averageTransaction,
            'topSellingItem' => $topSellingItem ? [
                'name' => $topSellingItem->name,
                'sold' => $topSellingItem->total_sold,
            ] : null,
            'busiestHour' => $busiestHour,
            'chartData' => $chartData,
        ]);
    }

    public function export(Request $request)
    {
        $startDateStr = $request->query('start_date');
        $endDateStr = $request->query('end_date');

        $query = Transaction::with('items.product', 'items.variant', 'customer', 'cashier');

        if ($startDateStr) {
            $query->where('created_at', '>=', Carbon::parse($startDateStr)->startOfDay());
        }

        if ($endDateStr) {
            $query->where('created_at', '<=', Carbon::parse($endDateStr)->endOfDay());
        }

        if ($request->filled('status') && $request->status !== 'ALL') {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_method') && $request->payment_method !== 'ALL') {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('transaction_number', 'like', '%'.$search.'%')
                    ->orWhereHas('customer', function ($customerQuery) use ($search) {
                        $customerQuery->where('name', 'like', '%'.$search.'%');
                    });
            });
        }

        $transactions = $query
            ->orderBy('created_at', 'ASC')
            ->get();

        $filenameDate = $startDateStr && $endDateStr
            ? Carbon::parse($startDateStr)->format('Ymd').'_to_'.Carbon::parse($endDateStr)->format('Ymd')
            : 'all';

        if ($request->query('format') === 'excel') {
            return $this->exportModernExcel($transactions, $filenameDate);
        }

        $headers = [
            'Content-type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename=BadakBizzPOS_Report_'.$filenameDate.'.csv',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $columns = [
            'Date', 'Transaction Number', 'Cashier', 'Customer', 'Payment Method',
            'Subtotal', 'Discount', 'Tax', 'Service Charge', 'Total Amount', 'Status',
            'Order Notes', 'Items', 'Item Notes',
        ];

        $callback = function () use ($transactions, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($transactions as $tx) {
                $row = [
                    $tx->created_at->format('Y-m-d H:i:s'),
                    $tx->transaction_number,
                    $tx->cashier ? $tx->cashier->name : 'N/A',
                    $tx->customer ? $tx->customer->name : 'Walk-in',
                    $tx->payment_method,
                    $tx->subtotal,
                    $tx->discount,
                    $tx->tax,
                    $tx->service_charge,
                    $tx->total_amount,
                    $tx->status,
                    $tx->notes,
                    $this->transactionItemsSummary($tx),
                    $this->transactionItemNotesSummary($tx),
                ];
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function exportModernExcel($transactions, string $filenameDate)
    {
        $rows = [[
            'Tanggal',
            'Nomor Transaksi',
            'Kasir',
            'Pelanggan',
            'Metode Pembayaran',
            'Subtotal',
            'Diskon',
            'Pajak',
            'Biaya Layanan',
            'Total',
            'Status',
            'Catatan Order',
            'Item',
            'Catatan Item',
        ]];

        foreach ($transactions as $tx) {
            $rows[] = [
                $tx->created_at->format('Y-m-d H:i:s'),
                $tx->transaction_number,
                $tx->cashier ? $tx->cashier->name : 'N/A',
                $tx->customer ? $tx->customer->name : 'Walk-in',
                $tx->payment_method,
                (float) $tx->subtotal,
                (float) $tx->discount,
                (float) $tx->tax,
                (float) $tx->service_charge,
                (float) $tx->total_amount,
                $tx->status,
                $tx->notes,
                $this->transactionItemsSummary($tx),
                $this->transactionItemNotesSummary($tx),
            ];
        }

        $files = [
            '[Content_Types].xml' => $this->excelContentTypesXml(),
            '_rels/.rels' => $this->excelRootRelationshipsXml(),
            'docProps/app.xml' => $this->excelAppPropertiesXml(),
            'docProps/core.xml' => $this->excelCorePropertiesXml(),
            'xl/workbook.xml' => $this->excelWorkbookXml(),
            'xl/_rels/workbook.xml.rels' => $this->excelWorkbookRelationshipsXml(),
            'xl/styles.xml' => $this->excelStylesXml(),
            'xl/worksheets/sheet1.xml' => $this->excelWorksheetXml($rows),
        ];

        $content = $this->createZipFromStrings($files);
        $headers = [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename=BadakBizzPOS_Report_'.$filenameDate.'.xlsx',
            'Content-Length' => (string) strlen($content),
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        return response($content, 200, $headers);
    }

    private function excelWorksheetXml(array $rows): string
    {
        $sheetData = '';

        foreach ($rows as $rowIndex => $row) {
            $rowNumber = $rowIndex + 1;
            $sheetData .= '<row r="'.$rowNumber.'">';

            foreach ($row as $columnIndex => $value) {
                $cellReference = $this->excelColumnName($columnIndex + 1).$rowNumber;
                $style = $rowIndex === 0 ? ' s="1"' : '';

                if ($rowIndex > 0 && is_numeric($value)) {
                    $sheetData .= '<c r="'.$cellReference.'"'.$style.'><v>'.$value.'</v></c>';
                } else {
                    $sheetData .= '<c r="'.$cellReference.'" t="inlineStr"'.$style.'><is><t>'.$this->xmlEscape($value).'</t></is></c>';
                }
            }

            $sheetData .= '</row>';
        }

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
            .'<sheetFormatPr defaultRowHeight="18"/>'
            .'<cols>'
            .'<col min="1" max="1" width="20" customWidth="1"/>'
            .'<col min="2" max="2" width="26" customWidth="1"/>'
            .'<col min="3" max="5" width="18" customWidth="1"/>'
            .'<col min="6" max="10" width="16" customWidth="1"/>'
            .'<col min="11" max="11" width="14" customWidth="1"/>'
            .'<col min="12" max="14" width="34" customWidth="1"/>'
            .'</cols>'
            .'<sheetData>'.$sheetData.'</sheetData>'
            .'</worksheet>';
    }

    private function transactionItemsSummary(Transaction $transaction): string
    {
        return $transaction->items
            ->map(function ($item) {
                $productName = $item->product?->name ?? 'Produk terhapus';
                $variantName = $item->variant ? ' - '.$item->variant->name : '';

                return $productName.$variantName.' x'.$item->quantity;
            })
            ->implode('; ');
    }

    private function transactionItemNotesSummary(Transaction $transaction): string
    {
        return $transaction->items
            ->filter(fn ($item) => filled($item->notes))
            ->map(function ($item) {
                $productName = $item->product?->name ?? 'Produk terhapus';
                $variantName = $item->variant ? ' - '.$item->variant->name : '';

                return $productName.$variantName.': '.$item->notes;
            })
            ->implode('; ');
    }

    private function excelColumnName(int $columnNumber): string
    {
        $columnName = '';

        while ($columnNumber > 0) {
            $columnNumber--;
            $columnName = chr(65 + ($columnNumber % 26)).$columnName;
            $columnNumber = intdiv($columnNumber, 26);
        }

        return $columnName;
    }

    private function createZipFromStrings(array $files): string
    {
        $localFiles = '';
        $centralDirectory = '';
        $offset = 0;
        $dosTime = $this->dosTime();
        $dosDate = $this->dosDate();

        foreach ($files as $path => $content) {
            $crc = crc32($content);
            $size = strlen($content);
            $localHeader = pack('VvvvvvVVVvv', 0x04034B50, 20, 0, 0, $dosTime, $dosDate, $crc, $size, $size, strlen($path), 0);
            $centralHeader = pack('VvvvvvvVVVvvvvvVV', 0x02014B50, 20, 20, 0, 0, $dosTime, $dosDate, $crc, $size, $size, strlen($path), 0, 0, 0, 0, 0, $offset);

            $localFiles .= $localHeader.$path.$content;
            $centralDirectory .= $centralHeader.$path;
            $offset += strlen($localHeader) + strlen($path) + $size;
        }

        $centralOffset = strlen($localFiles);
        $centralSize = strlen($centralDirectory);
        $fileCount = count($files);
        $endDirectory = pack('VvvvvVVv', 0x06054B50, 0, 0, $fileCount, $fileCount, $centralSize, $centralOffset, 0);

        return $localFiles.$centralDirectory.$endDirectory;
    }

    private function dosTime(): int
    {
        return ((int) date('H') << 11) | ((int) date('i') << 5) | ((int) date('s') >> 1);
    }

    private function dosDate(): int
    {
        return (((int) date('Y') - 1980) << 9) | ((int) date('m') << 5) | (int) date('d');
    }

    private function xmlEscape($value): string
    {
        return htmlspecialchars((string) $value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }

    private function excelContentTypesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            .'<Default Extension="xml" ContentType="application/xml"/>'
            .'<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
            .'<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
            .'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            .'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            .'</Types>';
    }

    private function excelRootRelationshipsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            .'<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
            .'</Relationships>';
    }

    private function excelWorkbookXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            .'<sheets><sheet name="Riwayat Transaksi" sheetId="1" r:id="rId1"/></sheets>'
            .'</workbook>';
    }

    private function excelWorkbookRelationshipsXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            .'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            .'<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            .'</Relationships>';
    }

    private function excelStylesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            .'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
            .'<fills count="1"><fill><patternFill patternType="none"/></fill></fills>'
            .'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
            .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
            .'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
            .'</styleSheet>';
    }

    private function excelCorePropertiesXml(): string
    {
        $createdAt = Carbon::now()->toIso8601ZuluString();

        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
            .'<dc:creator>BadakBizz POS</dc:creator>'
            .'<cp:lastModifiedBy>BadakBizz POS</cp:lastModifiedBy>'
            .'<dcterms:created xsi:type="dcterms:W3CDTF">'.$createdAt.'</dcterms:created>'
            .'<dcterms:modified xsi:type="dcterms:W3CDTF">'.$createdAt.'</dcterms:modified>'
            .'</cp:coreProperties>';
    }

    private function excelAppPropertiesXml(): string
    {
        return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">'
            .'<Application>BadakBizz POS</Application>'
            .'</Properties>';
    }
}
