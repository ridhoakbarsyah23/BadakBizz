<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;
    
    protected $fillable = [
        'sku', 'name', 'category_id', 'purchase_price', 
        'selling_price', 'stock', 'minimum_stock', 'is_active'
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
