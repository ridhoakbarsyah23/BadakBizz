<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Store extends Model
{
    protected $fillable = [
        'name',
        'phone',
        'address',
        'currency',
        'tax_rate',
        'service_charge_rate',
        'receipt_header',
        'receipt_footer',
    ];
}
