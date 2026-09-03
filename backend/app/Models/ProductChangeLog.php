<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductChangeLog extends Model
{
    protected $fillable = [
        'product_id',
        'product_variant_id',
        'user_id',
        'entity_type',
        'action',
        'changes',
    ];

    protected $casts = [
        'changes' => 'array',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id')->withTrashed();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
