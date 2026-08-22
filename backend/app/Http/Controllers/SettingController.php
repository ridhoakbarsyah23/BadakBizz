<?php

namespace App\Http\Controllers;

use App\Models\Store;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    public function show()
    {
        $store = Store::first();
        
        if (!$store) {
            $store = Store::create([
                'name' => 'Kivo Coffee & Eatery',
                'currency' => 'IDR',
                'tax_rate' => 11.00,
                'service_charge_rate' => 5.00,
                'receipt_header' => 'Kivo Coffee & Eatery',
                'receipt_footer' => 'Terima kasih atas kunjungan Anda!',
            ]);
        }

        return response()->json($store);
    }

    public function update(Request $request)
    {
        $store = Store::first();
        if (!$store) {
            return response()->json(['message' => 'Store setting not found'], 404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string|max:255',
            'tax_rate' => 'numeric|min:0|max:100',
            'service_charge_rate' => 'numeric|min:0|max:100',
            'receipt_header' => 'nullable|string|max:255',
            'receipt_footer' => 'nullable|string',
        ]);

        $store->update($validated);

        return response()->json([
            'message' => 'Settings updated successfully',
            'store' => $store
        ]);
    }
}
