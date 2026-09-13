<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ResetDemoCommandTest extends TestCase
{
    public function test_reset_is_disabled_by_default(): void
    {
        config(['demo.enabled' => false]);

        $this->artisan('demo:reset', ['--force' => true])
            ->expectsOutputToContain('Demo reset is disabled')
            ->assertFailed();
    }

    public function test_it_rebuilds_an_enabled_demo_database(): void
    {
        config(['demo.enabled' => true]);
        $this->artisan('migrate:fresh')->assertSuccessful();
        DB::table('categories')->insert(['name' => 'Temporary', 'slug' => 'temporary']);

        $this->artisan('demo:reset', ['--force' => true])
            ->expectsOutputToContain('Demo database is ready')
            ->assertSuccessful();

        $this->assertDatabaseMissing('categories', ['slug' => 'temporary']);
        $this->assertDatabaseCount('products', 12);
        $this->assertDatabaseCount('transactions', 8);
    }
}
