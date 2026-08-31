<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('stores')->update(['enable_shift_management' => true]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Shift management is now required for checkout, so do not disable it on rollback.
    }
};
