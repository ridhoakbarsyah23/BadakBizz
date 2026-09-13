<?php

namespace App\Console\Commands;

use Database\Seeders\DemoSeeder;
use Illuminate\Console\Command;

class ResetDemo extends Command
{
    protected $signature = 'demo:reset {--force : Skip the confirmation prompt}';

    protected $description = 'Rebuild the dedicated demo database and load the presentation dataset';

    public function handle(): int
    {
        if (! config('demo.enabled')) {
            $this->error('Demo reset is disabled. Set DEMO_MODE=true only on a dedicated demo environment.');

            return self::FAILURE;
        }

        if ($this->laravel->environment('production')) {
            $this->error('Demo reset is never allowed while APP_ENV=production.');

            return self::FAILURE;
        }

        if (! $this->option('force') && ! $this->confirm('This will erase and rebuild the current demo database. Continue?')) {
            $this->warn('Demo reset cancelled.');

            return self::SUCCESS;
        }

        $result = $this->call('migrate:fresh', [
            '--force' => true,
            '--seed' => true,
            '--seeder' => DemoSeeder::class,
        ]);

        if ($result !== self::SUCCESS) {
            $this->error('Demo database reset failed.');

            return self::FAILURE;
        }

        $this->info('Demo database is ready for the next presentation.');

        return self::SUCCESS;
    }
}
