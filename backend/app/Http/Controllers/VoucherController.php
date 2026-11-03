<?php

namespace App\Http\Controllers;

use App\Models\Voucher;
use Illuminate\Http\JsonResponse;

/**
 * Barcode vor dem Aktivieren prüfen, damit das Frontend Paket und Osmose-Option anzeigen kann.
 * Verrät nur, ob der Barcode gültig und frei ist – nicht, wer ihn eingelöst hat.
 */
class VoucherController extends Controller
{
    public function show(string $code): JsonResponse
    {
        $voucher = Voucher::with('package')->firstWhere('code', strtoupper(trim($code)))
            ?? abort(404, 'Dieser Barcode ist ungültig.');

        return response()->json(['voucher' => [
            'code' => $voucher->code,
            'package' => $voucher->package->key,
            'packageName' => $voucher->package->name,
            'includesOsmosis' => $voucher->package->includes_osmosis,
            'isFree' => $voucher->is_free,
            'isUsed' => $voucher->analysis()->exists(),
        ]]);
    }
}
