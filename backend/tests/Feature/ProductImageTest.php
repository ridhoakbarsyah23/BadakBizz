<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductImageTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_upload_product_image_and_api_returns_image_url(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->admin());

        $response = $this->post('/api/products', [
            'sku' => 'SKU-IMAGE',
            'name' => 'Image Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 4,
            'minimum_stock' => 1,
            'image' => UploadedFile::fake()->image('product.jpg', 600, 600),
        ], [
            'Accept' => 'application/json',
        ]);

        $response->assertCreated()
            ->assertJsonPath('sku', 'SKU-IMAGE')
            ->assertJson(fn ($json) => $json
                ->whereType('image_path', 'string')
                ->whereType('image_url', 'string')
                ->etc()
            );

        $product = Product::firstOrFail();
        Storage::disk('public')->assertExists($product->image_path);
        $this->assertStringContainsString('/storage/products/', $response->json('image_url'));
    }

    public function test_admin_can_replace_product_image_and_old_file_is_deleted(): void
    {
        Storage::fake('public');
        Sanctum::actingAs($this->admin());

        $product = Product::create([
            'sku' => 'SKU-REPLACE-IMAGE',
            'name' => 'Replace Image Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 4,
            'minimum_stock' => 1,
            'image_path' => UploadedFile::fake()->image('old.jpg')->store('products', 'public'),
        ]);
        $oldPath = $product->image_path;

        $response = $this->post("/api/products/{$product->id}", [
            '_method' => 'PUT',
            'sku' => 'SKU-REPLACE-IMAGE',
            'name' => 'Replace Image Product',
            'purchase_price' => 5_000,
            'selling_price' => 10_000,
            'stock' => 4,
            'minimum_stock' => 1,
            'image' => UploadedFile::fake()->image('new.webp', 600, 600),
        ], [
            'Accept' => 'application/json',
        ]);

        $response->assertOk()
            ->assertJsonPath('sku', 'SKU-REPLACE-IMAGE')
            ->assertJson(fn ($json) => $json
                ->whereType('image_path', 'string')
                ->whereType('image_url', 'string')
                ->etc()
            );

        $product->refresh();
        Storage::disk('public')->assertMissing($oldPath);
        Storage::disk('public')->assertExists($product->image_path);
    }

    private function admin(): User
    {
        $role = Role::firstOrCreate(
            ['slug' => 'admin'],
            ['name' => 'Admin']
        );

        return User::factory()->create([
            'role_id' => $role->id,
            'is_active' => true,
        ]);
    }
}
