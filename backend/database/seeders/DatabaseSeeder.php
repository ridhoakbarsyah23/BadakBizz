<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Roles
        $adminRole = Role::firstOrCreate(['slug' => 'admin'], ['name' => 'Administrator']);
        $cashierRole = Role::firstOrCreate(['slug' => 'cashier'], ['name' => 'Cashier']);

        // Create Admin User
        User::firstOrCreate(
            ['email' => 'admin@kivo.com'],
            [
                'name' => 'Super Admin',
                'password' => Hash::make('password'),
                'role_id' => $adminRole->id,
            ]
        );

        // Create Cashier User
        User::firstOrCreate(
            ['email' => 'cashier@kivo.com'],
            [
                'name' => 'Cashier Staff',
                'password' => Hash::make('password'),
                'role_id' => $cashierRole->id,
            ]
        );
    }
}
