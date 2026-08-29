<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use App\Services\TransactionStatusService;
use Illuminate\Http\Request;
use Midtrans\Config;
use Midtrans\CoreApi;
use Midtrans\Notification;

class MidtransController extends Controller
{
    public function generateQris(Request $request)
    {
        Config::$serverKey = env('MIDTRANS_SERVER_KEY');
        Config::$isProduction = filter_var(env('MIDTRANS_IS_PRODUCTION', false), FILTER_VALIDATE_BOOLEAN);
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
            $notif = new Notification;

            $transaction = $notif->transaction_status;
            $order_id = $notif->order_id;

            $posTransaction = Transaction::where('transaction_number', $order_id)->first();

            if (! $posTransaction) {
                return response()->json(['message' => 'Transaction not found'], 404);
            }

            if ($transaction == 'settlement' || $transaction == 'capture') {
                app(TransactionStatusService::class)->complete($posTransaction);
            } elseif ($transaction == 'cancel' || $transaction == 'deny' || $transaction == 'expire') {
                app(TransactionStatusService::class)->cancel($posTransaction, null, 'Midtrans '.ucfirst($transaction));
            } elseif ($transaction == 'pending' && $posTransaction->status !== 'COMPLETED') {
                $posTransaction->update(['status' => 'PENDING']);
            }

            return response()->json(['message' => 'Webhook received']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Webhook error: '.$e->getMessage()], 500);
        }
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
