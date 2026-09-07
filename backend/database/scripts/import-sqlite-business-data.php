<?php

declare(strict_types=1);

$root = dirname(__DIR__, 2);
$envPath = $root.DIRECTORY_SEPARATOR.'.env';
$sqlitePath = $argv[1] ?? $root.DIRECTORY_SEPARATOR.'database'.DIRECTORY_SEPARATOR.'database.sqlite';

if (! is_file($envPath)) {
    fwrite(STDERR, "Missing .env file.\n");
    exit(1);
}

if (! is_file($sqlitePath)) {
    fwrite(STDERR, "SQLite database not found: {$sqlitePath}\n");
    exit(1);
}

$env = [];
foreach (file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);

    if ($line === '' || str_starts_with($line, '#') || ! str_contains($line, '=')) {
        continue;
    }

    [$key, $value] = explode('=', $line, 2);
    $env[$key] = trim($value, "\"'");
}

if (($env['DB_CONNECTION'] ?? '') !== 'mysql') {
    fwrite(STDERR, "DB_CONNECTION must be mysql before importing.\n");
    exit(1);
}

$mysql = new PDO(
    sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $env['DB_HOST'] ?? '127.0.0.1',
        $env['DB_PORT'] ?? '3306',
        $env['DB_DATABASE'] ?? 'badakbizz',
    ),
    $env['DB_USERNAME'] ?? 'root',
    $env['DB_PASSWORD'] ?? '',
    [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ],
);

$sqlite = new PDO('sqlite:'.$sqlitePath, null, null, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

$tables = [
    'roles',
    'stores',
    'users',
    'categories',
    'customers',
    'tables',
    'products',
    'product_variants',
    'cashier_shifts',
    'transactions',
    'transaction_items',
    'inventory_movements',
    'product_change_logs',
];

function sqliteTableExists(PDO $sqlite, string $table): bool
{
    $statement = $sqlite->prepare("select name from sqlite_master where type = 'table' and name = ?");
    $statement->execute([$table]);

    return (bool) $statement->fetchColumn();
}

function sqliteColumns(PDO $sqlite, string $table): array
{
    $columns = [];

    foreach ($sqlite->query('PRAGMA table_info("'.$table.'")')->fetchAll() as $column) {
        $columns[] = $column['name'];
    }

    return $columns;
}

function mysqlColumns(PDO $mysql, string $table): array
{
    $columns = [];
    $statement = $mysql->query('SHOW COLUMNS FROM `'.$table.'`');

    foreach ($statement->fetchAll() as $column) {
        $columns[] = $column['Field'];
    }

    return $columns;
}

function quoteIdentifier(string $identifier): string
{
    return '`'.str_replace('`', '``', $identifier).'`';
}

$copied = [];
$skipped = [];

try {
    $mysql->exec('SET FOREIGN_KEY_CHECKS=0');

    foreach (array_reverse($tables) as $table) {
        $mysql->exec('DELETE FROM '.quoteIdentifier($table));
    }

    foreach ($tables as $table) {
        if (! sqliteTableExists($sqlite, $table)) {
            $skipped[$table] = 'missing in sqlite';
            continue;
        }

        $columns = array_values(array_intersect(sqliteColumns($sqlite, $table), mysqlColumns($mysql, $table)));

        if ($columns === []) {
            $skipped[$table] = 'no common columns';
            continue;
        }

        $sourceRows = $sqlite->query('SELECT '.implode(', ', array_map(fn ($column) => '"'.$column.'"', $columns)).' FROM "'.$table.'"')->fetchAll();

        if ($sourceRows === []) {
            $copied[$table] = 0;
            continue;
        }

        $insertSql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            quoteIdentifier($table),
            implode(', ', array_map('quoteIdentifier', $columns)),
            implode(', ', array_fill(0, count($columns), '?')),
        );
        $insert = $mysql->prepare($insertSql);

        foreach ($sourceRows as $row) {
            $insert->execute(array_map(fn ($column) => $row[$column], $columns));
        }

        $copied[$table] = count($sourceRows);

        if (in_array('id', $columns, true)) {
            $nextId = ((int) $mysql->query('SELECT COALESCE(MAX(`id`), 0) + 1 FROM '.quoteIdentifier($table))->fetchColumn());
            $mysql->exec('ALTER TABLE '.quoteIdentifier($table).' AUTO_INCREMENT = '.$nextId);
        }
    }

    $mysql->exec('SET FOREIGN_KEY_CHECKS=1');
} catch (Throwable $error) {
    $mysql->exec('SET FOREIGN_KEY_CHECKS=1');
    fwrite(STDERR, $error->getMessage()."\n");
    exit(1);
}

foreach ($copied as $table => $count) {
    echo $table.': '.$count.PHP_EOL;
}

foreach ($skipped as $table => $reason) {
    echo $table.': skipped ('.$reason.')'.PHP_EOL;
}
