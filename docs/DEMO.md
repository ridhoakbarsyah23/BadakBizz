# Panduan Demo BadakBizz

Panduan ini digunakan untuk presentasi BadakBizz kepada calon pengguna. Gunakan
database khusus demo agar data usaha utama tidak tercampur atau terhapus.

## Persiapan Sebelum Presentasi

1. Aktifkan mode demo pada `backend/.env`:

   ```env
   APP_ENV=local
   DEMO_MODE=true
   AUTH_PUBLIC_REGISTRATION=false
   MIDTRANS_IS_PRODUCTION=false
   ```

2. Buat file `.env` di folder utama project untuk mengaktifkan pilihan akun
   demo saat frontend dibangun:

   ```env
   NEXT_PUBLIC_DEMO_MODE=true
   ```

3. Bangun ulang frontend karena variabel `NEXT_PUBLIC_` diterapkan ketika proses
   build berlangsung:

   ```powershell
   docker compose up -d --build frontend
   ```

4. Bangun ulang database demo dan isi dataset awal:

   ```powershell
   docker compose exec backend php artisan demo:reset
   ```

5. Pastikan seluruh layanan sehat:

   ```powershell
   docker compose ps
   ```

6. Buka <http://localhost:3000>. Pilih **Demo Administrator** atau **Demo
   Kasir** untuk mengisi kredensial secara otomatis, kemudian tekan **Masuk**.

   Kredensial yang digunakan:

   | Peran | Email | Kata sandi |
   | --- | --- | --- |
   | Administrator | `admin@badakbiz.com` | `password` |
   | Kasir | `cashier@badakbiz.com` | `password` |

## Alur Presentasi 10 Menit

1. **Dashboard admin (1 menit)**
   Tunjukkan pendapatan hari ini, tren tujuh hari, produk terlaris, jumlah
   pelanggan, serta peringatan stok rendah dan habis.

2. **Katalog dan inventori (2 menit)**
   Buka produk untuk menunjukkan kategori, SKU, barcode, harga beli/jual,
   varian ukuran, dan status stok. Lanjutkan ke inventori untuk menunjukkan
   histori pergerakan stok.

3. **Operasional kasir (4 menit)**
   Masuk sebagai kasir, buka shift dengan modal awal, lalu buat pesanan dine-in.
   Pilih meja, tambahkan produk dan varian, berikan catatan item, kemudian
   simpan pesanan. Buka kembali pesanan tersebut dan selesaikan secara tunai.

4. **Struk dan transaksi (1 menit)**
   Tunjukkan detail pembayaran, uang kembali, dan tampilan cetak struk.

5. **Laporan bisnis (2 menit)**
   Masuk kembali sebagai admin. Tunjukkan transaksi yang baru dibuat, perubahan
   stok, omzet, estimasi keuntungan produk, serta ekspor laporan.

## Catatan QRIS

Gunakan QRIS hanya jika kredensial Midtrans Sandbox sudah dikonfigurasi. Jangan
memasukkan kunci production untuk presentasi. Jika Sandbox belum tersedia,
jelaskan bahwa QRIS telah didukung lalu gunakan pembayaran tunai untuk demo
langsung.

## Mengembalikan Kondisi Awal

Setelah selesai latihan atau menerima kunjungan calon pengguna, jalankan:

```powershell
docker compose exec backend php artisan demo:reset --force
```

Perintah ini menghapus seluruh isi database yang sedang terhubung dan membangun
ulang dataset demo. Perintah akan ditolak jika `DEMO_MODE` tidak aktif atau
`APP_ENV=production`.
