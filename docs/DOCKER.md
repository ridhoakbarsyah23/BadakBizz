# Panduan Docker BadakBizz

Dokumen ini melengkapi langkah cepat pada [README utama](../README.md).

## Service yang Dijalankan

| Service | Fungsi | Alamat dari komputer |
| --- | --- | --- |
| `frontend` | Tampilan Next.js | `http://localhost:3000` |
| `nginx` | Pintu masuk menuju API Laravel | `http://localhost:8000` |
| `backend` | Aplikasi Laravel/PHP-FPM | Hanya di jaringan Docker |
| `mysql` | Database MySQL | `127.0.0.1:3307` |

## Perintah Dasar

Build dan jalankan seluruh service:

```powershell
docker compose up -d --build
```

Periksa status:

```powershell
docker compose ps
```

Seluruh service seharusnya berstatus `healthy`. Status `health: starting`
berarti pemeriksaan masih berlangsung; tunggu beberapa saat dan jalankan
perintah tersebut kembali.

Tampilkan log seluruh service:

```powershell
docker compose logs -f
```

Tampilkan log service tertentu:

```powershell
docker compose logs -f frontend
docker compose logs -f backend nginx
```

Tekan `Ctrl+C` untuk keluar dari tampilan log tanpa menghentikan container.

## Menggunakan Port Alternatif

Port `3000` atau `8000` mungkin sudah digunakan oleh server lokal. Atur port
alternatif pada sesi PowerShell yang sama:

```powershell
$env:FRONTEND_PORT="3001"
$env:BACKEND_PORT="8001"
$env:NEXT_PUBLIC_API_URL="http://localhost:8001"
docker compose up -d --build
```

Aplikasi kemudian tersedia di <http://localhost:3001> dan API di
`http://localhost:8001/api`.

`NEXT_PUBLIC_API_URL` ditanam saat frontend dibangun. Karena itu, frontend harus
di-build ulang setiap kali alamat backend berubah.

Variabel PowerShell tersebut hanya berlaku pada terminal aktif. Untuk kembali
ke port default, buka terminal baru atau hapus variabelnya:

```powershell
Remove-Item Env:FRONTEND_PORT -ErrorAction SilentlyContinue
Remove-Item Env:BACKEND_PORT -ErrorAction SilentlyContinue
Remove-Item Env:NEXT_PUBLIC_API_URL -ErrorAction SilentlyContinue
```

## Database dan File Upload

Docker menyimpan data pada named volume:

- `mysql_data` untuk database MySQL.
- `backend_uploads` untuk gambar dan file yang diunggah.

Perintah berikut aman untuk menghentikan container tanpa menghapus volume:

```powershell
docker compose down
```

Jangan menjalankan perintah berikut jika datanya masih dibutuhkan:

```powershell
docker compose down --volumes
```

Perintah tersebut menghapus volume database dan file upload. Siapkan backup
sebelum melakukan pemindahan atau penggantian database.

## Perubahan Kode Belum Terlihat

Image production tidak menggunakan hot reload. Build ulang service yang berubah:

```powershell
docker compose up -d --build frontend
docker compose up -d --build backend nginx
```

Untuk perubahan migration backend:

```powershell
docker compose exec backend php artisan migrate --force
```

Jangan menggunakan `migrate:fresh` pada database yang menyimpan data penting
karena seluruh tabel akan dibuat ulang.

## Database Terlihat Kosong

Database MySQL lokal pada port `3306` berbeda dari database Docker pada port
`3307`. Docker tidak menyalin data lokal secara otomatis.

Seeder bawaan hanya membuat akun demo, role, toko, dan meja. Produk, kategori,
pelanggan, stok, serta transaksi harus dibuat melalui aplikasi atau dipindahkan
dari backup database.

## Container Tidak Sehat

1. Pastikan Docker Desktop aktif.
2. Periksa status dengan `docker compose ps`.
3. Baca log menggunakan `docker compose logs frontend backend nginx mysql`.
4. Pastikan port yang digunakan tidak dipakai aplikasi lain.
5. Setelah memperbaiki konfigurasi, jalankan `docker compose up -d --build`.

## Catatan Production

Sebelum deployment production:

- Gunakan `APP_ENV=production` dan `APP_DEBUG=false`.
- Gunakan `APP_KEY` dan password database yang kuat.
- Ganti seluruh kredensial demo.
- Batasi `FRONTEND_URL` ke domain frontend yang sebenarnya.
- Gunakan HTTPS.
- Siapkan backup rutin untuk database dan file upload.
