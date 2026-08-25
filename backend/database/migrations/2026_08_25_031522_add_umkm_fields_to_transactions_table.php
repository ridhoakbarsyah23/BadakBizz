<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->enum('order_type', ['dine_in', 'takeaway', 'delivery', 'direct_sale'])->default('direct_sale')->after('status');
            $table->foreignId('table_id')->nullable()->constrained()->nullOnDelete()->after('order_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['table_id']);
            $table->dropColumn(['order_type', 'table_id']);
        });
    }
};
