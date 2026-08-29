# BadakBizz

BadakBizz adalah aplikasi Point of Sale (kasir) untuk mengelola transaksi, stok,
produk, pelanggan, staf, laporan, dan pengaturan toko. Proyek ini memakai
arsitektur terpisah: frontend Next.js dan backend Laravel REST API.

## Arsitektur

- **Frontend**: Next.js 16 App Router, React 19, Tailwind CSS, shadcn/ui, HeroUI, lucide-react, Recharts.
- **Backend**: Laravel 13, Laravel Sanctum, SQLite default untuk pengembangan lokal.
- **Pembayaran**: Tunai dan QRIS dinamis melalui Midtrans.

## Memulai Proyek

Jalankan backend dan frontend di terminal terpisah.

### 1. Backend Laravel

```bash
cd backend
composer install
php artisan migrate
php artisan db:seed
php artisan serve
```

API backend default berjalan di `http://127.0.0.1:8000`.

### 2. Frontend Next.js

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

UI frontend default tersedia di `http://localhost:3000`.

`NEXT_PUBLIC_API_URL` mengatur base URL backend yang dipakai browser. Untuk
lokal, nilai defaultnya:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Kredensial Bawaan

Jika sudah menjalankan seeder:

- **Admin**: `admin@badakbiz.com` / `password`
- **Cashier**: `cashier@badakbiz.com` / `password`

## Fitur

- Dashboard ringkasan transaksi dan grafik penjualan.
- POS checkout dengan keranjang, diskon, pajak, service charge, tunai, dan QRIS.
- Produk, kategori, inventaris, dan restock.
- Pelanggan dan riwayat transaksi.
- Staff, role, shift kasir, laporan, dan pengaturan struk.
- Struktur awal untuk fitur UMKM seperti varian produk dan meja dine-in.

## Verifikasi

Backend:

```bash
cd backend
php artisan test
```

Frontend:

```bash
cd frontend
npm run lint
npx tsc --noEmit
```
