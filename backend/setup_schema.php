<?php

$dir = __DIR__ . '/database/migrations/';
$files = scandir($dir);

// Map table names to their schema definitions
$schemas = [
    'roles_table' => function() {
        return "            \$table->id();
            \$table->string('name');
            \$table->string('slug')->unique();
            \$table->timestamps();";
    },
    'stores_table' => function() {
        return "            \$table->id();
            \$table->string('name');
            \$table->string('phone')->nullable();
            \$table->string('address')->nullable();
            \$table->string('currency')->default('IDR');
            \$table->decimal('tax_rate', 5, 2)->default(11);
            \$table->timestamps();";
    },
    'categories_table' => function() {
        return "            \$table->id();
            \$table->string('name');
            \$table->string('slug')->unique();
            \$table->timestamps();";
    },
    'products_table' => function() {
        return "            \$table->id();
            \$table->string('sku')->unique();
            \$table->string('name');
            \$table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            \$table->decimal('purchase_price', 15, 2)->default(0);
            \$table->decimal('selling_price', 15, 2)->default(0);
            \$table->integer('stock')->default(0);
            \$table->integer('minimum_stock')->default(0);
            \$table->boolean('is_active')->default(true);
            \$table->timestamps();";
    },
    'inventory_movements_table' => function() {
        return "            \$table->id();
            \$table->foreignId('product_id')->constrained()->cascadeOnDelete();
            \$table->enum('type', ['IN', 'OUT', 'ADJUSTMENT']);
            \$table->integer('quantity');
            \$table->string('notes')->nullable();
            \$table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            \$table->timestamps();";
    },
    'customers_table' => function() {
        return "            \$table->id();
            \$table->string('name');
            \$table->string('phone')->nullable();
            \$table->string('email')->nullable();
            \$table->integer('total_transactions')->default(0);
            \$table->decimal('total_spending', 15, 2)->default(0);
            \$table->timestamps();";
    },
    'transactions_table' => function() {
        return "            \$table->id();
            \$table->string('transaction_number')->unique();
            \$table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            \$table->foreignId('cashier_id')->nullable()->constrained('users')->nullOnDelete();
            \$table->decimal('subtotal', 15, 2);
            \$table->decimal('tax', 15, 2)->default(0);
            \$table->decimal('discount', 15, 2)->default(0);
            \$table->decimal('total_amount', 15, 2);
            \$table->decimal('payment_amount', 15, 2)->default(0);
            \$table->string('payment_method')->default('CASH');
            \$table->string('status')->default('COMPLETED');
            \$table->timestamps();";
    },
    'transaction_items_table' => function() {
        return "            \$table->id();
            \$table->foreignId('transaction_id')->constrained()->cascadeOnDelete();
            \$table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            \$table->integer('quantity');
            \$table->decimal('price', 15, 2);
            \$table->decimal('subtotal', 15, 2);
            \$table->timestamps();";
    },
    'users_table' => function() {
        return "            \$table->id();
            \$table->string('name');
            \$table->string('email')->unique();
            \$table->timestamp('email_verified_at')->nullable();
            \$table->string('password');
            \$table->foreignId('role_id')->nullable()->constrained()->nullOnDelete();
            \$table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
            \$table->rememberToken();
            \$table->timestamps();";
    }
];

foreach ($files as $file) {
    if ($file === '.' || $file === '..') continue;
    
    $content = file_get_contents($dir . $file);
    
    foreach ($schemas as $key => $schemaFunc) {
        if (strpos($file, $key) !== false) {
            // Find Schema::create
            $pattern = '/Schema::create\(.*?, function \(Blueprint \$table\) \{(.*?)\}\);/s';
            $replacement = "Schema::create('" . str_replace('_table', '', $key) . "', function (Blueprint \$table) {\n" . $schemaFunc() . "\n        });";
            $content = preg_replace($pattern, $replacement, $content);
            file_put_contents($dir . $file, $content);
            echo "Updated migration: $file\n";
        }
    }
}

echo "Migrations updated successfully!\n";
