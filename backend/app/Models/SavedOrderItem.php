<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedOrderItem extends Model
{
    protected $fillable = [
        'saved_order_id',
        'product_id',
        'variant_id',
        'product_name',
        'variant_name',
        'unit_price',
        'quantity',
        'notes',
    ];

    protected $casts = [
        'unit_price' => 'decimal:2',
    ];

    public function savedOrder(): BelongsTo
    {
        return $this->belongsTo(SavedOrder::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class)->withTrashed();
    }
}
