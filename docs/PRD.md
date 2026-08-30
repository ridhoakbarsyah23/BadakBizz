# Product Requirements Document: BadakBizz POS

Tanggal: 30 Agustus 2026
Status: Draft v1
Pemilik produk: BadakBizz
Platform: Web application, Next.js frontend dan Laravel REST API backend

## 1. Ringkasan

BadakBizz POS adalah aplikasi kasir untuk UMKM, terutama bisnis F&B dan retail kecil, yang membantu operasional harian toko dari pencatatan transaksi, pembayaran tunai dan QRIS, pengelolaan stok, produk, varian, pelanggan, staf, shift kasir, meja dine-in, laporan, sampai pengaturan struk.

Produk ini berfokus pada alur kasir yang cepat dan akurat, sekaligus memberi pemilik usaha visibilitas terhadap penjualan, stok, performa produk, dan aktivitas staf. Versi awal sudah memakai arsitektur terpisah: frontend Next.js dan backend Laravel API dengan autentikasi Sanctum.

## 2. Tujuan Produk

1. Mempercepat proses checkout di kasir dengan keranjang POS, pencarian produk, pemilihan varian, diskon, pajak, service charge, dan cetak struk.
2. Mengurangi kesalahan stok dengan pemotongan otomatis saat transaksi dan penambahan kembali saat void atau pembatalan QRIS.
3. Mendukung bisnis F&B melalui manajemen meja, order dine-in/takeaway, dan pembayaran QRIS dinamis.
4. Memberi admin data operasional melalui dashboard, riwayat transaksi, laporan keuangan, ekspor data, dan audit stok.
5. Membatasi akses fitur berdasarkan peran admin dan cashier agar operasional lebih aman.

## 3. Masalah Yang Diselesaikan

UMKM sering mencatat transaksi, stok, pelanggan, dan laporan secara terpisah. Dampaknya:

- Kasir lambat saat jam ramai.
- Stok sulit dipercaya karena tidak otomatis mengikuti transaksi.
- Pembayaran non-tunai sulit dicocokkan dengan status transaksi.
- Pemilik usaha sulit melihat produk terlaris, pendapatan, dan performa shift.
- Data pelanggan dan riwayat pembelian tidak terpusat.

BadakBizz POS menyatukan alur tersebut dalam satu sistem operasional toko.

## 4. Target Pengguna

### Admin atau pemilik usaha

Admin mengatur data master, staf, produk, kategori, stok, meja, pajak, service charge, struk, serta melihat dashboard dan laporan.

Kebutuhan utama:

- Tahu pendapatan dan performa toko.
- Mengelola produk dan stok secara mudah.
- Memantau transaksi dan shift kasir.
- Melakukan koreksi transaksi melalui void.
- Mengekspor laporan untuk pembukuan.

### Cashier atau staf kasir

Cashier menjalankan transaksi harian, membuka dan menutup shift, memilih produk, mengelola pelanggan, memilih meja, memproses pembayaran, dan melihat riwayat transaksi yang relevan.

Kebutuhan utama:

- Checkout cepat.
- Tampilan produk dan varian jelas.
- Pembayaran tunai dan QRIS mudah diproses.
- Status meja dan QRIS tidak membingungkan.
- Struk dapat dicetak setelah pembayaran.

## 5. Ruang Lingkup MVP

### Termasuk MVP

- Login, logout, profil pengguna, dan role admin/cashier.
- Dashboard ringkasan penjualan untuk admin.
- POS checkout untuk transaksi tunai dan QRIS.
- Produk, kategori, barcode/SKU, unit, harga beli, harga jual, stok, minimum stok, dan status aktif.
- Varian produk dengan SKU varian, penyesuaian harga, dan stok per varian.
- Manajemen stok melalui restock dan riwayat pergerakan stok.
- Pelanggan dan akumulasi total transaksi serta total belanja.
- Manajemen staf dan role.
- Shift kasir: buka shift, tutup shift, kas awal, kas akhir, estimasi kas, selisih.
- Manajemen meja dine-in dengan status available, occupied, dan reserved.
- Riwayat transaksi dengan filter status, metode pembayaran, tanggal, dan pencarian.
- Laporan penjualan, rata-rata transaksi, produk terlaris, jam tersibuk, grafik penjualan/profit, dan ekspor CSV/XLSX.
- Pengaturan toko: nama, tipe bisnis, pajak, service charge, fitur meja, fitur kitchen receipts, kontak, alamat, header/footer struk, dan ukuran struk.
- Webhook Midtrans untuk menyelesaikan atau membatalkan transaksi QRIS.

### Di Luar MVP

- Multi-cabang.
- Hak akses granular selain admin/cashier.
- Offline-first dan sinkronisasi konflik.
- Reservasi meja berbasis jadwal.
- Kitchen display system penuh.
- Integrasi akuntansi eksternal.
- Program loyalti lanjutan.
- Manajemen supplier dan purchase order.
- Mobile native app.

## 6. User Journey Utama

### Checkout tunai

1. Cashier login.
2. Cashier membuka shift jika belum ada shift aktif.
3. Cashier membuka halaman POS.
4. Cashier memilih order type, pelanggan opsional, dan meja untuk dine-in.
5. Cashier memilih produk atau varian produk.
6. Sistem menghitung subtotal, diskon, service charge, pajak, total, dan kembalian.
7. Cashier memilih metode pembayaran CASH dan memasukkan nominal bayar.
8. Sistem membuat transaksi COMPLETED.
9. Sistem mengurangi stok, mencatat inventory movement OUT, memperbarui customer totals, dan melepas meja jika dine-in.
10. Cashier mencetak struk.

### Checkout QRIS

1. Cashier membuat transaksi dengan metode QRIS.
2. Sistem membuat transaksi PENDING dan mengunci stok serta meja bila dine-in.
3. Sistem meminta QRIS dinamis ke Midtrans.
4. Cashier menampilkan QRIS kepada pelanggan.
5. Sistem mengecek status atau menerima webhook Midtrans.
6. Jika settlement/capture, transaksi menjadi COMPLETED dan meja dilepas.
7. Jika cancel/deny/expire atau dibatalkan manual, transaksi menjadi CANCELLED, stok dikembalikan, dan meja dilepas.

### Restock

1. Admin membuka halaman Manajemen Stok.
2. Admin memilih produk atau varian.
3. Admin memasukkan kuantitas dan catatan.
4. Sistem menambah stok dan membuat inventory movement IN.

### Tutup shift

1. Cashier membuka halaman shift atau aksi tutup shift.
2. Cashier memasukkan kas akhir.
3. Sistem menghitung expected cash dari kas awal ditambah total transaksi CASH yang completed.
4. Sistem menampilkan selisih PAS, LEBIH, atau KURANG.

## 7. Requirement Fungsional

### 7.1 Autentikasi dan Role

- Sistem harus mendukung login menggunakan email dan password.
- Sistem harus mengeluarkan token API setelah login berhasil.
- Sistem harus menolak user nonaktif.
- Sistem harus menyediakan informasi user aktif melalui endpoint profil.
- Admin dapat mengakses seluruh modul.
- Cashier dapat mengakses POS, pelanggan, transaksi, shift, produk read-only, kategori read-only, meja read-only, dan pengaturan read-only yang dibutuhkan POS.
- Sistem harus menyediakan update profil untuk user yang sedang login.

### 7.2 POS dan Transaksi

- Cashier dapat membuat transaksi dengan minimal satu item.
- Item transaksi harus mengacu ke produk yang valid.
- Produk dengan varian wajib memilih variant_id.
- Produk tanpa varian tidak boleh menerima variant_id.
- Harga item varian adalah harga jual produk ditambah price_adjustment varian.
- Sistem harus menolak transaksi jika stok produk atau varian tidak cukup.
- Sistem harus mendukung metode pembayaran CASH, QRIS, TRANSFER, dan CARD di API.
- Alur UI prioritas MVP adalah CASH dan QRIS.
- Sistem harus menghitung subtotal dari seluruh item.
- Sistem harus mendukung diskon nominal.
- Jika customer_id dipilih dan diskon tidak dikirim, sistem dapat menerapkan diskon default member 5%.
- Diskon tidak boleh lebih besar dari subtotal.
- Sistem harus menghitung service charge dari nilai setelah diskon.
- Sistem harus menghitung pajak dari nilai setelah diskon ditambah service charge.
- Sistem harus menyimpan status COMPLETED untuk transaksi non-QRIS.
- Sistem harus menyimpan status PENDING untuk transaksi QRIS sampai pembayaran terkonfirmasi.
- Sistem harus menghubungkan transaksi ke kasir login dan shift aktif jika tersedia.

### 7.3 QRIS dan Midtrans

- Sistem harus dapat menghasilkan QRIS dinamis berdasarkan transaction_number dan total transaksi.
- Sistem harus menyimpan midtrans_transaction_id dan qris_string pada transaksi QRIS.
- Sistem harus menyediakan endpoint status QRIS berdasarkan order_id.
- Webhook Midtrans harus memvalidasi signature_key sebelum memproses status.
- Webhook settlement atau capture harus menyelesaikan transaksi.
- Webhook cancel, deny, atau expire harus membatalkan transaksi dan mengembalikan stok.
- Pembatalan manual hanya boleh untuk transaksi QRIS berstatus PENDING.

### 7.4 Produk, Kategori, dan Varian

- Admin dapat membuat, membaca, mengubah, dan menghapus kategori.
- Admin dapat membuat, membaca, mengubah, dan menghapus produk.
- Produk memiliki SKU unik, barcode opsional, nama, kategori opsional, harga beli, harga jual, unit, stok, minimum stok, status aktif, dan penanda has_variants.
- Produk dengan has_variants dapat memiliki satu atau lebih varian.
- Varian memiliki nama, SKU opsional unik, price_adjustment, dan stok.
- Saat produk varian diubah, sistem dapat mengganti daftar varian lama dengan daftar varian baru.
- POS harus dapat menampilkan produk dan varian dengan cara yang mudah dipilih kasir.

### 7.5 Inventaris

- Sistem harus mencatat movement OUT saat transaksi dibuat.
- Sistem harus mencatat movement IN saat restock.
- Sistem harus mencatat movement IN saat transaksi dibatalkan atau void.
- Movement harus menyimpan product_id, variant_id opsional, type, quantity, notes, user_id, dan timestamp.
- Restock produk dengan varian wajib memilih varian.
- Restock produk tanpa varian tidak boleh memilih varian.
- Admin dapat melihat riwayat movement terbaru beserta produk, SKU, varian, dan SKU varian.
- Produk dengan stok di bawah minimum stok harus mudah dikenali di UI.

### 7.6 Meja dan Order Type

- Sistem harus mendukung order_type dine_in dan takeaway di alur transaksi utama.
- Dine-in dapat memiliki table_id.
- Takeaway tidak boleh memiliki table_id.
- Dine-in dengan table_id hanya dapat dibuat jika meja available.
- Saat transaksi dine-in dibuat, meja harus menjadi occupied.
- Saat transaksi selesai atau dibatalkan, meja harus kembali available.
- Admin dapat membuat, mengubah, dan menghapus meja.
- Admin dan cashier dapat melihat daftar meja.
- Seeder lokal membuat Meja 1 sampai Meja 8 secara idempotent.

### 7.7 Pelanggan

- Admin dan cashier dapat mengelola data pelanggan.
- Data pelanggan minimal berisi nama, phone opsional, email opsional, total_transactions, dan total_spending.
- Saat transaksi completed dengan customer_id, sistem harus menambah total_transactions dan total_spending.
- Saat transaksi completed di-void, sistem harus mengurangi total_transactions dan total_spending tanpa membuat nilai negatif.
- Pelanggan dapat digunakan untuk pencarian riwayat transaksi.

### 7.8 Staff dan Shift

- Admin dapat melihat, membuat, dan mengubah data staf.
- Staf memiliki role admin atau cashier.
- User dapat memiliki status aktif/nonaktif.
- Cashier dapat membuka satu shift aktif.
- Sistem harus menolak pembukaan shift baru jika user masih memiliki shift open.
- Cashier dapat menutup shift dengan memasukkan ending_cash.
- Sistem harus menghitung expected_cash dari starting_cash dan total transaksi CASH completed dalam shift.
- Sistem harus menghitung discrepancy untuk shift closed.

### 7.9 Dashboard dan Laporan

- Admin dapat melihat dashboard penjualan.
- Admin dapat memfilter dashboard berdasarkan periode yang tersedia di UI.
- Laporan default menggunakan rentang year-to-date jika tanggal tidak dipilih.
- Admin dapat melihat total revenue, average transaction, top selling item, busiest hour, dan chart sales/profit.
- Jika rentang tanggal <= 31 hari, chart ditampilkan harian.
- Jika rentang tanggal > 31 hari, chart ditampilkan bulanan.
- Admin dapat mengekspor transaksi ke CSV.
- Admin dapat mengekspor transaksi ke XLSX.
- Ekspor harus mendukung filter tanggal, status, metode pembayaran, dan pencarian.

### 7.10 Pengaturan Toko dan Struk

- Admin dapat mengubah nama toko, tipe bisnis, fitur meja, fitur kitchen receipts, telepon, alamat, pajak, service charge, header struk, footer struk, dan ukuran struk.
- Admin dan cashier dapat membaca pengaturan toko untuk kebutuhan POS.
- Sistem harus menyediakan default pengaturan toko jika belum ada data store.
- Ukuran struk harus mendukung 58mm dan 80mm.

## 8. Requirement Non-Fungsional

- Keamanan: seluruh endpoint operasional selain login dan webhook harus menggunakan autentikasi Sanctum.
- Otorisasi: endpoint admin harus dilindungi middleware role admin.
- Integritas data: operasi transaksi, stok, meja, dan pembatalan harus memakai database transaction serta lock saat mengubah stok atau meja.
- Auditabilitas: perubahan stok harus tercatat sebagai inventory movement.
- Kinerja: halaman POS harus tetap responsif untuk katalog UMKM dengan ratusan produk.
- Ketersediaan: alur tunai harus tetap berjalan meskipun konfigurasi Midtrans bermasalah.
- Maintainability: frontend menggunakan API helper terpusat untuk base URL.
- Portabilitas: pengembangan lokal berjalan dengan SQLite, namun rancangan data harus tetap cocok untuk database produksi seperti MySQL atau PostgreSQL.

## 9. Model Data Konseptual

- User: nama, email, password, role_id, is_active.
- Role: name, slug.
- Store: nama, tipe bisnis, currency, tax_rate, service_charge_rate, receipt settings, feature flags.
- Category: nama dan metadata kategori.
- Product: SKU, barcode, nama, kategori, harga beli, harga jual, unit, stok, minimum stok, status aktif, has_variants.
- ProductVariant: product_id, nama, SKU, price_adjustment, stok.
- Customer: nama, phone, email, total_transactions, total_spending.
- Table: nama dan status.
- CashierShift: user_id, start_time, end_time, starting_cash, ending_cash, status.
- Transaction: transaction_number, customer, cashier, shift, subtotal, tax, service_charge, discount, total_amount, payment_amount, payment_method, status, order_type, table, Midtrans fields.
- TransactionItem: transaction, product, variant opsional, quantity, price, subtotal.
- InventoryMovement: product, variant opsional, type, quantity, notes, user.

## 10. Status dan Aturan Bisnis

### Status transaksi

- PENDING: transaksi QRIS dibuat, menunggu pembayaran.
- COMPLETED: pembayaran berhasil atau transaksi non-QRIS selesai.
- CANCELLED: transaksi dibatalkan, void, atau QRIS gagal/expired.

### Status meja

- available: meja dapat dipilih untuk dine-in.
- occupied: meja sedang dipakai oleh transaksi aktif atau pending.
- reserved: disiapkan untuk kebutuhan reservasi di masa depan.

### Status shift

- open: cashier sedang bertugas.
- closed: shift sudah ditutup dan memiliki ending_cash.

## 11. Success Metrics

- Waktu checkout rata-rata transaksi tunai kurang dari 60 detik untuk keranjang kecil.
- Selisih stok akibat transaksi dan void tercatat 100% melalui inventory movement.
- Transaksi QRIS tidak meninggalkan meja occupied setelah status final.
- Admin dapat mengekspor laporan transaksi sesuai filter tanpa manipulasi manual tambahan.
- Cashier tidak dapat mengakses fitur admin seperti produk, laporan, staf, dan pengaturan toko.

## 12. Risiko dan Mitigasi

- Risiko: transaksi QRIS pending bisa tertinggal jika webhook tidak diterima.
  Mitigasi: sediakan polling status dan aksi cancel pending QRIS.

- Risiko: stok produk varian tidak konsisten jika update varian menghapus data lama.
  Mitigasi: validasi dampak update varian terhadap histori, dan pertimbangkan soft-delete varian pada fase berikutnya.

- Risiko: cashier melakukan transaksi tanpa shift aktif.
  Mitigasi: UI perlu mendorong open shift sebelum checkout, dan fase berikutnya dapat mewajibkan shift aktif.

- Risiko: laporan menghitung transaksi CANCELLED jika query tidak memfilter status.
  Mitigasi: definisikan apakah laporan revenue hanya menghitung COMPLETED, lalu sesuaikan query dan test.

- Risiko: single-store design membatasi ekspansi multi-cabang.
  Mitigasi: pertahankan struktur store_id dan rancang migration multi-store secara eksplisit ketika dibutuhkan.

## 13. Roadmap Lanjutan

### Fase 1: Stabilitas Operasional

- Wajibkan shift aktif sebelum cashier checkout.
- Pastikan laporan revenue dan dashboard hanya menghitung transaksi COMPLETED.
- Tambahkan guard UI untuk transaksi QRIS pending agar cashier jelas harus menunggu, cek status, atau batalkan.
- Tambahkan test untuk laporan, shift, dan role access di alur kritis.

### Fase 2: F&B Enhancement

- Kitchen receipt atau kitchen display sederhana.
- Catatan item, catatan order, dan opsi modifier.
- Split bill dan merge table.
- Reservasi meja berbasis jam.

### Fase 3: Inventory Enhancement

- Stock adjustment manual dengan alasan.
- Riwayat perubahan produk dan harga.
- Supplier, purchase order, dan receiving stock.
- Low-stock alert dan rekomendasi restock.

### Fase 4: Growth dan Integrasi

- Loyalty point atau membership tier.
- WhatsApp receipt atau invoice link.
- Multi-cabang.
- Integrasi akuntansi dan export format pembukuan.
- Deployment production hardening.

## 14. Open Questions

1. Apakah target utama BadakBizz adalah F&B, retail, atau keduanya sama penting?
2. Apakah cashier harus diwajibkan membuka shift sebelum transaksi, atau cukup opsional?
3. Apakah laporan revenue harus selalu mengecualikan transaksi CANCELLED dan PENDING?
4. Apakah QRIS menjadi metode pembayaran utama selain cash, atau transfer/card juga perlu UI penuh?
5. Apakah fitur kitchen receipts perlu masuk MVP atau fase berikutnya?
6. Apakah varian produk boleh dihapus jika sudah pernah dipakai transaksi, atau harus diarsipkan?
7. Apakah sistem akan dipakai satu toko saja atau perlu disiapkan untuk multi-cabang?

## 15. Acceptance Criteria MVP

- Admin dapat login dan mengakses dashboard, produk, kategori, inventory, meja, pelanggan, staf, transaksi, laporan, dan pengaturan.
- Cashier dapat login dan hanya melihat modul yang sesuai perannya.
- Cashier dapat menyelesaikan transaksi CASH dan stok berkurang sesuai produk atau varian.
- Cashier dapat membuat transaksi QRIS PENDING, menerima status sukses/gagal, dan sistem memperbarui stok serta meja dengan benar.
- Admin dapat restock produk biasa dan produk varian.
- Admin dapat melihat movement stok dari transaksi, restock, void, dan cancel pending QRIS.
- Admin dapat membuat meja dan cashier dapat memilih meja available untuk dine-in.
- Sistem menolak dine-in dengan meja occupied.
- Admin dapat mengekspor laporan CSV dan XLSX berdasarkan filter.
- Pengaturan pajak, service charge, dan struk dipakai dalam perhitungan POS dan tampilan struk.
