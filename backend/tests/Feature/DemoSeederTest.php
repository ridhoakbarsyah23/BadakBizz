<?php

namespace Tests\Feature;

use Database\Seeders\DemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_seeds_a_complete_and_repeatable_demo_dataset(): void
    {
        $this->seed(DemoSeeder::class);
        $this->seed(DemoSeeder::class);

        $this->assertDatabaseCount('products', 12);
        $this->assertDatabaseCount('product_variants', 2);
        $this->assertDatabaseCount('customers', 4);
        $this->assertDatabaseCount('transactions', 8);
        $this->assertDatabaseCount('transaction_items', 19);
        $this->assertDatabaseCount('inventory_movements', 13);

        $this->assertSame(2, DB::table('transactions')->whereDate('created_at', now()->toDateString())->count());
        $this->assertSame(8, DB::table('transactions')->where('status', 'COMPLETED')->count());
        $this->assertSame(4, DB::table('categories')->where('slug', 'like', 'demo-%')->count());
        $this->assertSame(1, DB::table('products')->where('sku', 'DEMO-CML-003')->where('stock', 0)->count());
        $this->assertSame(1, DB::table('products')->where('sku', 'DEMO-MNM-002')->where('stock', 7)->count());
    }
}
