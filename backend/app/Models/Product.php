<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'sku', 'barcode', 'image_path', 'name', 'category_id', 'purchase_price',
        'selling_price', 'unit', 'has_variants', 'stock', 'minimum_stock', 'is_active',
    ];

    protected $appends = [
        'image_url',
    ];

    protected $casts = [
        'has_variants' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function getImageUrlAttribute(): ?string
    {
        if (! $this->image_path) {
            return null;
        }

        return asset('storage/'.$this->image_path);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function transactionItems()
    {
        return $this->hasMany(TransactionItem::class);
    }
}
