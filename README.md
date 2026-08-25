# BadakBiz 🏪

BadakBiz adalah aplikasi Point of Sale (Kasir) modern dan responsif yang dirancang untuk membantu Anda mengelola toko, inventaris, dan transaksi secara efisien. Dibangun menggunakan arsitektur terpisah (separated architecture) dengan standar industri saat ini.

## 🏗️ Arsitektur

- **Frontend**: [Next.js 15+](https://nextjs.org/) (App Router) dengan [shadcn/ui](https://ui.shadcn.com/) dan Tailwind CSS.
- **Backend**: [Laravel 11](https://laravel.com/) dengan SQLite (bawaan) yang menyediakan RESTful API.
- **Autentikasi**: Laravel Sanctum (Autentikasi API berbasis token).

## 🚀 Memulai Proyek

Karena proyek ini dipisahkan menjadi `frontend` dan `backend`, Anda perlu menjalankan dua server pengembangan (development server) yang terpisah.

### 1. Pengaturan Backend (Laravel)

Masuk ke direktori `backend`:
```bash
cd backend
```

Instal dependensi dan jalankan server:
```bash
composer install
php artisan migrate
php artisan db:seed # Opsional: jika Anda ingin mengisi data awal
php artisan serve
```
API backend akan berjalan di `http://127.0.0.1:8000`.

### 2. Pengaturan Frontend (Next.js)

Buka terminal baru dan masuk ke direktori `frontend`:
```bash
cd frontend
```

Instal dependensi dan jalankan server Next.js:
```bash
npm install
npm run dev
```
UI frontend akan tersedia di `http://localhost:3000`.

## 🔐 Kredensial Bawaan

Untuk masuk ke Dashboard BadakBiz, gunakan kredensial berikut (jika Anda telah menjalankan seeder database):
- **Email:** `admin@badakbiz.com`
- **Password:** `password123`

## 🌟 Fitur

- **Dashboard**: Grafik real-time dan ringkasan transaksi terbaru.
- **Kasir (POS) / Checkout**: Sistem keranjang interaktif dengan simulasi pembayaran tunai dan QRIS.
- **Inventaris & Produk**: Kelola katalog, harga, dan pantau ketersediaan stok Anda.
- **Kategori**: Mengelompokkan produk dengan rapi dan efisien.
- **Transaksi & Laporan**: Riwayat transaksi dan metrik performa penjualan.
- **Pengaturan**: Konfigurasi profil dan pengaturan toko.

## 💻 Sorotan Teknologi
- `React 19` & `Next.js`
- `Tailwind CSS` & ikon dari `lucide-react`
- `Laravel 11` & `Eloquent ORM`
- `Recharts` untuk visualisasi data interaktif
