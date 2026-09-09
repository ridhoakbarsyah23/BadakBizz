# BadakBizz

BadakBizz adalah aplikasi Point of Sale (POS/kasir) untuk membantu operasional
toko, mulai dari transaksi, produk, stok, pelanggan, staf, hingga laporan
penjualan.

## Fitur Utama

- Dashboard dan ringkasan penjualan.
- Transaksi tunai dan QRIS melalui Midtrans.
- Pengelolaan produk, kategori, varian, dan stok.
- Data pelanggan dan riwayat transaksi.
- Meja dine-in dan pesanan tersimpan.
- Shift kasir, staf, laporan, dan pengaturan struk.

## Teknologi

- **Frontend**: Next.js 16, React 19, dan Tailwind CSS.
- **Backend**: Laravel 13 REST API dengan Laravel Sanctum.
- **Database**: MySQL 8.
- **Container**: Docker Compose dan Nginx.

## Cara Termudah: Jalankan dengan Docker

Cara ini direkomendasikan karena frontend, backend, web server, dan database
akan disiapkan secara otomatis di dalam container.

### Prasyarat

Pastikan sudah tersedia:

- Docker Desktop dalam keadaan aktif.
- Git untuk mengambil source code.
- PowerShell untuk menjalankan perintah berikut.

### 1. Siapkan konfigurasi backend

Jalankan dari folder utama project:

```powershell
Copy-Item backend/.env.example backend/.env
```

Jika `backend/.env` sudah tersedia, lewati perintah tersebut agar konfigurasi
yang ada tidak tertimpa.

Pastikan `APP_KEY` di dalam `backend/.env` sudah berisi nilai. Untuk instalasi
baru, tampilkan key menggunakan container:

```powershell
docker compose build backend
docker compose run --rm --no-deps backend php artisan key:generate --show
```

Salin hasil yang diawali `base64:` ke baris `APP_KEY=` di `backend/.env`.
File tersebut berisi konfigurasi lokal dan tidak boleh dimasukkan ke Git.

### 2. Jalankan aplikasi

```powershell
docker compose up -d --build
docker compose ps
```

Tunggu sampai service `mysql`, `backend`, `nginx`, dan `frontend` berstatus
`healthy`.

### 3. Siapkan database baru

Jalankan langkah ini hanya saat volume database Docker masih baru dan kosong:

```powershell
docker compose exec backend php artisan migrate --force
docker compose exec backend php artisan db:seed --force
```

Seeder membuat akun demo, role, toko, dan meja. Seeder tidak membuat produk,
pelanggan, atau transaksi. Jika sudah memiliki data bisnis, impor backup
database dan jangan menjalankan seeder sebagai penggantinya.

### 4. Buka aplikasi

- Aplikasi: <http://localhost:3000>
- Pemeriksaan backend: <http://localhost:8000/up>

Gunakan akun demo berikut setelah menjalankan seeder:

| Hak akses | Email | Kata sandi |
| --- | --- | --- |
| Administrator | `admin@badakbiz.com` | `password` |
| Kasir | `cashier@badakbiz.com` | `password` |

Kredensial tersebut hanya untuk pengembangan. Ganti kata sandi sebelum aplikasi
digunakan di lingkungan production.

## Aktivitas Development Sehari-hari

Menyalakan container yang sudah pernah dibuat:

```powershell
docker compose start
```

Melihat status dan log aplikasi:

```powershell
docker compose ps
docker compose logs -f frontend backend nginx
```

Tekan `Ctrl+C` untuk berhenti melihat log. Container tetap berjalan.

Setelah mengubah source code, build ulang service terkait:

```powershell
docker compose up -d --build frontend
docker compose up -d --build backend nginx
```

Jika menambahkan migration Laravel baru:

```powershell
docker compose exec backend php artisan migrate --force
```

Menghentikan seluruh container tanpa menghapus data:

```powershell
docker compose down
```

Jangan menambahkan opsi `--volumes` jika database dan gambar produk masih
dibutuhkan.

## Menjalankan Tanpa Docker

Bagian ini merupakan alternatif untuk developer yang ingin menjalankan service
secara manual. Siapkan PHP 8.3, Composer, Node.js, npm, dan MySQL terlebih dahulu.

### Backend Laravel

Pastikan database MySQL bernama `badakbizz` sudah tersedia, kemudian jalankan:

```powershell
Set-Location backend
Copy-Item .env.example .env
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

Jika `.env` sudah tersedia, jangan menyalinnya kembali. Backend akan berjalan di
<http://127.0.0.1:8000>.

### Frontend Next.js

Buka terminal PowerShell lain, kemudian jalankan:

```powershell
Set-Location frontend
Copy-Item .env.example .env.local
npm.cmd ci
npm.cmd run dev
```

Jika `.env.local` sudah tersedia, jangan menyalinnya kembali. Frontend akan
berjalan di <http://localhost:3000>.

## Menjalankan Pengujian

Backend:

```powershell
Set-Location backend
composer install
php artisan test
```

Image backend Docker dibuat khusus untuk runtime production dan tidak membawa
PHPUnit. Karena itu, pengujian backend dijalankan dari folder lokal.

Frontend:

```powershell
Set-Location frontend
npm.cmd run lint
npx.cmd tsc --noEmit
```

## Mengalami Kendala?

Lihat [panduan Docker](docs/DOCKER.md) untuk penggunaan port alternatif,
pengelolaan data, perintah log, dan solusi masalah yang umum terjadi.

Dokumen kebutuhan produk tersedia di [PRD BadakBizz](docs/PRD.md).
