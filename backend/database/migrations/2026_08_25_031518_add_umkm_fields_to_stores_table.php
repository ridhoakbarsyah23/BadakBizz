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
        Schema::table('stores', function (Blueprint $table) {
            $table->enum('business_type', ['retail', 'fnb', 'services', 'mixed'])->default('retail')->after('name');
            $table->boolean('enable_table_management')->default(false)->after('business_type');
            $table->boolean('enable_kitchen_receipts')->default(false)->after('enable_table_management');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['business_type', 'enable_table_management', 'enable_kitchen_receipts']);
        });
    }
};
