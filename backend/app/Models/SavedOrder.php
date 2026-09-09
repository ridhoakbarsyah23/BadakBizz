<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavedOrder extends Model
{
    protected $fillable = [
        'user_id',
        'customer_id',
        'table_id',
        'name',
        'order_type',
        'custom_discount_percent',
        'notes',
    ];

    protected $casts = [
        'custom_discount_percent' => 'decimal:2',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function table(): BelongsTo
    {
        return $this->belongsTo(Table::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(SavedOrderItem::class);
    }
}
