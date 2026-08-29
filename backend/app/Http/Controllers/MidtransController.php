<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Services\TransactionStatusService;
use Illuminate\Http\Request;
use Midtrans\Config;
use Midtrans\CoreApi;

class MidtransController extends Controller
{
    public function generateQris(Request $request)
    {
        Config::$serverKey = config('services.midtrans.server_key');
        Config::$isProduction = filter_var(config('services.midtrans.is_production'), FILTER_VALIDATE_BOOLEAN);
        Config::$isSanitized = true;
        Config::$is3ds = true;

        $request->validate([
            'order_id' => 'required|string',
            'gross_amount' => 'required|numeric|min:1',
        ]);

        $params = [
            'payment_type' => 'gopay', // Core API uses gopay to return a QRIS URL
            'transaction_details' => [
                'order_id' => $request->order_id,
                'gross_amount' => (int) round($request->gross_amount),
            ],
        ];

        try {
            $response = CoreApi::charge($params);

            // Midtrans Core API returns the QR string in actions array
            if (isset($response->actions)) {
                $qrString = null;
                foreach ($response->actions as $action) {
                    if ($action->name === 'generate-qr-code') {
                        $qrString = $action->url; // For GoPay/QRIS, URL is actually the raw QR string
                    }
                }

                Transaction::where('transaction_number', $request->order_id)
                    ->where('payment_method', 'QRIS')
                    ->update([
                        'midtrans_transaction_id' => $response->transaction_id,
                        'qris_string' => $qrString,
                    ]);

                return response()->json([
                    'status' => 'success',
                    'qr_string' => $qrString,
                    'transaction_id' => $response->transaction_id,
                ]);
            }

            return response()->json(['status' => 'error', 'message' => 'Failed to generate QRIS'], 400);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
        }
    }

    public function webhook(Request $request)
    {
        try {
            $serverKey = config('services.midtrans.server_key');
            if (! $serverKey) {
                return response()->json(['message' => 'Midtrans server key is not configured'], 500);
            }

            $validated = $request->validate([
                'order_id' => 'required|string',
                'status_code' => 'required|string',
                'gross_amount' => 'required',
                'signature_key' => 'required|string',
                'transaction_status' => 'required|string',
            ]);

            if (! $this->hasValidSignature($validated, $serverKey)) {
                return response()->json(['message' => 'Invalid Midtrans signature'], 403);
            }

            $posTransaction = Transaction::where('transaction_number', $validated['order_id'])->first();

            if (! $posTransaction) {
                return response()->json(['message' => 'Transaction not found'], 404);
            }

            $transactionStatus = $validated['transaction_status'];

            if ($transactionStatus == 'settlement' || $transactionStatus == 'capture') {
                app(TransactionStatusService::class)->complete($posTransaction);
            } elseif ($transactionStatus == 'cancel' || $transactionStatus == 'deny' || $transactionStatus == 'expire') {
                app(TransactionStatusService::class)->cancel($posTransaction, null, 'Midtrans '.ucfirst($transactionStatus));
            } elseif ($transactionStatus == 'pending' && $posTransaction->status !== 'COMPLETED') {
                $posTransaction->update(['status' => 'PENDING']);
            }

            return response()->json(['message' => 'Webhook received']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Webhook error: '.$e->getMessage()], 500);
        }
    }

    private function hasValidSignature(array $payload, string $serverKey): bool
    {
        $signaturePayload = $payload['order_id']
            .$payload['status_code']
            .$payload['gross_amount']
            .$serverKey;

        return hash_equals(
            hash('sha512', $signaturePayload),
            $payload['signature_key']
        );
    }

    public function checkStatus($order_id)
    {
        $posTransaction = Transaction::where('transaction_number', $order_id)->first();
        if (! $posTransaction) {
            return response()->json(['status' => 'error', 'message' => 'Not found'], 404);
        }

        return response()->json([
            'status' => 'success',
            'transaction_status' => $posTransaction->status,
        ]);
    }
}
