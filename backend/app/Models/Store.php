<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    protected $fillable = [
        'name',
        'business_type',
        'enable_table_management',
        'enable_kitchen_receipts',
        'enable_shift_management',
        'phone',
        'address',
        'currency',
        'tax_rate',
        'service_charge_rate',
        'receipt_header',
        'receipt_footer',
        'receipt_width',
    ];

    protected $casts = [
        'enable_table_management' => 'boolean',
        'enable_kitchen_receipts' => 'boolean',
        'enable_shift_management' => 'boolean',
    ];
}
