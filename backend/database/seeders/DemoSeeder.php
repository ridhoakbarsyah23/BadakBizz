<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use App\Models\Transaction;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DemoSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $this->call(DatabaseSeeder::class);

            $store = Store::firstOrCreate(['name' => 'BadakBizz Coffee & Eatery']);
            $store->update([
                'business_type' => 'fnb',
                'enable_table_management' => true,
                'enable_kitchen_receipts' => true,
                'enable_shift_management' => true,
                'phone' => '0812-3456-7890',
                'address' => 'Jl. Merdeka No. 17, Bandung',
                'currency' => 'IDR',
                'tax_rate' => 10,
                'service_charge_rate' => 5,
                'receipt_header' => 'BadakBizz Coffee & Eatery',
                'receipt_footer' => 'Terima kasih, sampai jumpa kembali!',
                'receipt_width' => 80,
            ]);

            $categories = collect([
                ['name' => 'Kopi', 'slug' => 'demo-kopi'],
                ['name' => 'Minuman', 'slug' => 'demo-minuman'],
                ['name' => 'Makanan', 'slug' => 'demo-makanan'],
                ['name' => 'Camilan', 'slug' => 'demo-camilan'],
            ])->mapWithKeys(function (array $category) {
                $model = Category::updateOrCreate(['slug' => $category['slug']], $category);

                return [$category['slug'] => $model];
            });

            $products = collect($this->products())->mapWithKeys(function (array $data) use ($categories) {
                $variants = $data['variants'] ?? [];
                unset($data['variants']);

                $categorySlug = $data['category'];
                unset($data['category']);

                $product = Product::updateOrCreate(
                    ['sku' => $data['sku']],
                    [...$data, 'category_id' => $categories[$categorySlug]->id]
                );

                foreach ($variants as $variant) {
                    ProductVariant::withTrashed()->updateOrCreate(
                        ['sku' => $variant['sku']],
                        [...$variant, 'product_id' => $product->id, 'deleted_at' => null]
                    );
                }

                return [$data['sku'] => $product->fresh('variants')];
            });

            $customers = collect([
                ['name' => 'Alya Putri', 'phone' => '081200001001', 'email' => 'alya.demo@badakbiz.test'],
                ['name' => 'Bima Saputra', 'phone' => '081200001002', 'email' => 'bima.demo@badakbiz.test'],
                ['name' => 'Citra Lestari', 'phone' => '081200001003', 'email' => 'citra.demo@badakbiz.test'],
                ['name' => 'Dimas Pratama', 'phone' => '081200001004', 'email' => 'dimas.demo@badakbiz.test'],
            ])->mapWithKeys(function (array $customer) {
                $model = Customer::updateOrCreate(
                    ['email' => $customer['email']],
                    [...$customer, 'total_transactions' => 0, 'total_spending' => 0]
                );

                return [$customer['email'] => $model];
            });

            $cashier = User::where('email', 'cashier@badakbiz.com')->firstOrFail();
            $this->seedInventory($products, $cashier);
            $this->seedTransactions($products, $customers, $cashier);
            $this->refreshCustomerTotals($customers);
        });
    }

    private function products(): array
    {
        return [
            ['sku' => 'DEMO-KOPI-001', 'barcode' => '899000000001', 'name' => 'Kopi Susu Badak', 'category' => 'demo-kopi', 'purchase_price' => 9000, 'selling_price' => 22000, 'unit' => 'cup', 'has_variants' => true, 'stock' => 0, 'minimum_stock' => 10, 'is_active' => true, 'variants' => [
                ['name' => 'Regular', 'sku' => 'DEMO-KOPI-001-R', 'price_adjustment' => 0, 'stock' => 42],
                ['name' => 'Large', 'sku' => 'DEMO-KOPI-001-L', 'price_adjustment' => 5000, 'stock' => 28],
            ]],
            ['sku' => 'DEMO-KOPI-002', 'barcode' => '899000000002', 'name' => 'Americano', 'category' => 'demo-kopi', 'purchase_price' => 7000, 'selling_price' => 18000, 'unit' => 'cup', 'has_variants' => false, 'stock' => 35, 'minimum_stock' => 10, 'is_active' => true],
            ['sku' => 'DEMO-KOPI-003', 'barcode' => '899000000003', 'name' => 'Caramel Latte', 'category' => 'demo-kopi', 'purchase_price' => 12000, 'selling_price' => 28000, 'unit' => 'cup', 'has_variants' => false, 'stock' => 24, 'minimum_stock' => 8, 'is_active' => true],
            ['sku' => 'DEMO-MNM-001', 'barcode' => '899000000004', 'name' => 'Matcha Cream', 'category' => 'demo-minuman', 'purchase_price' => 11000, 'selling_price' => 26000, 'unit' => 'cup', 'has_variants' => false, 'stock' => 18, 'minimum_stock' => 8, 'is_active' => true],
            ['sku' => 'DEMO-MNM-002', 'barcode' => '899000000005', 'name' => 'Cokelat Hazelnut', 'category' => 'demo-minuman', 'purchase_price' => 10000, 'selling_price' => 25000, 'unit' => 'cup', 'has_variants' => false, 'stock' => 7, 'minimum_stock' => 8, 'is_active' => true],
            ['sku' => 'DEMO-MNM-003', 'barcode' => '899000000006', 'name' => 'Lemon Tea', 'category' => 'demo-minuman', 'purchase_price' => 6000, 'selling_price' => 16000, 'unit' => 'cup', 'has_variants' => false, 'stock' => 30, 'minimum_stock' => 10, 'is_active' => true],
            ['sku' => 'DEMO-MKN-001', 'barcode' => '899000000007', 'name' => 'Nasi Goreng Kampung', 'category' => 'demo-makanan', 'purchase_price' => 16000, 'selling_price' => 35000, 'unit' => 'porsi', 'has_variants' => false, 'stock' => 20, 'minimum_stock' => 5, 'is_active' => true],
            ['sku' => 'DEMO-MKN-002', 'barcode' => '899000000008', 'name' => 'Rice Bowl Ayam Sambal Matah', 'category' => 'demo-makanan', 'purchase_price' => 15000, 'selling_price' => 32000, 'unit' => 'porsi', 'has_variants' => false, 'stock' => 16, 'minimum_stock' => 5, 'is_active' => true],
            ['sku' => 'DEMO-MKN-003', 'barcode' => '899000000009', 'name' => 'Mie Goreng Spesial', 'category' => 'demo-makanan', 'purchase_price' => 14000, 'selling_price' => 30000, 'unit' => 'porsi', 'has_variants' => false, 'stock' => 12, 'minimum_stock' => 5, 'is_active' => true],
            ['sku' => 'DEMO-CML-001', 'barcode' => '899000000010', 'name' => 'Kentang Goreng', 'category' => 'demo-camilan', 'purchase_price' => 9000, 'selling_price' => 20000, 'unit' => 'porsi', 'has_variants' => false, 'stock' => 22, 'minimum_stock' => 8, 'is_active' => true],
            ['sku' => 'DEMO-CML-002', 'barcode' => '899000000011', 'name' => 'Pisang Cokelat Keju', 'category' => 'demo-camilan', 'purchase_price' => 8000, 'selling_price' => 19000, 'unit' => 'porsi', 'has_variants' => false, 'stock' => 15, 'minimum_stock' => 6, 'is_active' => true],
            ['sku' => 'DEMO-CML-003', 'barcode' => '899000000012', 'name' => 'Croissant Butter', 'category' => 'demo-camilan', 'purchase_price' => 10000, 'selling_price' => 23000, 'unit' => 'pcs', 'has_variants' => false, 'stock' => 0, 'minimum_stock' => 5, 'is_active' => true],
        ];
    }

    private function seedInventory($products, User $cashier): void
    {
        InventoryMovement::where('notes', 'like', '[DEMO]%')->delete();

        foreach ($products as $product) {
            if ($product->has_variants) {
                foreach ($product->variants as $variant) {
                    InventoryMovement::create([
                        'product_id' => $product->id,
                        'variant_id' => $variant->id,
                        'type' => 'IN',
                        'quantity' => $variant->stock,
                        'notes' => '[DEMO] Stok awal untuk presentasi',
                        'user_id' => $cashier->id,
                    ]);
                }
            } else {
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'type' => 'IN',
                    'quantity' => $product->stock,
                    'notes' => '[DEMO] Stok awal untuk presentasi',
                    'user_id' => $cashier->id,
                ]);
            }
        }
    }

    private function seedTransactions($products, $customers, User $cashier): void
    {
        $sales = [
            ['days_ago' => 6, 'hour' => 10, 'customer' => 'alya.demo@badakbiz.test', 'method' => 'CASH', 'type' => 'takeaway', 'items' => [['DEMO-KOPI-001', 2, 'Regular'], ['DEMO-CML-001', 1]]],
            ['days_ago' => 5, 'hour' => 13, 'customer' => null, 'method' => 'QRIS', 'type' => 'dine_in', 'items' => [['DEMO-MKN-001', 2], ['DEMO-MNM-003', 2]]],
            ['days_ago' => 4, 'hour' => 19, 'customer' => 'bima.demo@badakbiz.test', 'method' => 'CASH', 'type' => 'dine_in', 'items' => [['DEMO-MKN-002', 1], ['DEMO-KOPI-001', 1, 'Large'], ['DEMO-CML-002', 1]]],
            ['days_ago' => 3, 'hour' => 11, 'customer' => 'citra.demo@badakbiz.test', 'method' => 'QRIS', 'type' => 'takeaway', 'items' => [['DEMO-KOPI-003', 2], ['DEMO-CML-003', 1]]],
            ['days_ago' => 2, 'hour' => 15, 'customer' => null, 'method' => 'CASH', 'type' => 'dine_in', 'items' => [['DEMO-MKN-003', 2], ['DEMO-MNM-002', 2]]],
            ['days_ago' => 1, 'hour' => 18, 'customer' => 'dimas.demo@badakbiz.test', 'method' => 'QRIS', 'type' => 'delivery', 'items' => [['DEMO-MKN-002', 2], ['DEMO-MNM-001', 2], ['DEMO-CML-001', 1]]],
            ['days_ago' => 0, 'hour' => 9, 'customer' => 'alya.demo@badakbiz.test', 'method' => 'CASH', 'type' => 'takeaway', 'items' => [['DEMO-KOPI-001', 2, 'Regular'], ['DEMO-CML-002', 1]]],
            ['days_ago' => 0, 'hour' => 12, 'customer' => 'bima.demo@badakbiz.test', 'method' => 'QRIS', 'type' => 'dine_in', 'items' => [['DEMO-MKN-001', 1], ['DEMO-KOPI-003', 1], ['DEMO-MNM-003', 1]]],
        ];

        foreach ($sales as $index => $sale) {
            $timestamp = Carbon::today()->subDays($sale['days_ago'])->setTime($sale['hour'], 15);
            $lines = collect($sale['items'])->map(function (array $line) use ($products) {
                [$sku, $quantity] = $line;
                $product = $products[$sku];
                $variant = isset($line[2]) ? $product->variants->firstWhere('name', $line[2]) : null;
                $price = (float) $product->selling_price + (float) ($variant?->price_adjustment ?? 0);

                return compact('product', 'variant', 'quantity', 'price');
            });

            $subtotal = $lines->sum(fn (array $line) => $line['price'] * $line['quantity']);
            $tax = round($subtotal * 0.10);
            $serviceCharge = $sale['type'] === 'dine_in' ? round($subtotal * 0.05) : 0;
            $total = $subtotal + $tax + $serviceCharge;
            $transaction = Transaction::updateOrCreate(
                ['transaction_number' => sprintf('DEMO-%03d', $index + 1)],
                [
                    'customer_id' => $sale['customer'] ? $customers[$sale['customer']]->id : null,
                    'cashier_id' => $cashier->id,
                    'cashier_shift_id' => null,
                    'subtotal' => $subtotal,
                    'tax' => $tax,
                    'service_charge' => $serviceCharge,
                    'discount' => 0,
                    'total_amount' => $total,
                    'payment_amount' => $sale['method'] === 'CASH' ? ceil($total / 10000) * 10000 : $total,
                    'payment_method' => $sale['method'],
                    'status' => 'COMPLETED',
                    'order_type' => $sale['type'],
                    'table_id' => null,
                    'notes' => '[DEMO] Transaksi contoh untuk presentasi',
                    'created_at' => $timestamp,
                    'updated_at' => $timestamp,
                ]
            );

            $transaction->items()->delete();
            foreach ($lines as $line) {
                $transaction->items()->create([
                    'product_id' => $line['product']->id,
                    'variant_id' => $line['variant']?->id,
                    'quantity' => $line['quantity'],
                    'price' => $line['price'],
                    'purchase_price' => $line['product']->purchase_price,
                    'subtotal' => $line['price'] * $line['quantity'],
                ]);
            }
        }
    }

    private function refreshCustomerTotals($customers): void
    {
        foreach ($customers as $customer) {
            $transactions = Transaction::where('customer_id', $customer->id)
                ->where('transaction_number', 'like', 'DEMO-%')
                ->where('status', 'COMPLETED');

            $customer->update([
                'total_transactions' => (clone $transactions)->count(),
                'total_spending' => (clone $transactions)->sum('total_amount'),
            ]);
        }
    }
}
