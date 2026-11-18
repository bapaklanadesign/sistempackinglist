# Panduan Google Search Console — CV MR Express

## Status saat ini

Situs belum dipublikasikan dan belum memiliki alamat publik yang terkonfirmasi. Karena itu, sitemap XML dan baris `Sitemap:` di robots.txt belum dibuat. Alamat pratinjau tidak digunakan sebagai alamat situs untuk Google.

Panduan ini tidak berarti situs sudah terverifikasi atau terindeks di Google.

## Halaman yang boleh masuk sitemap

- Halaman publik: `/` (beranda), `/layanan`, `/rute-pengiriman`, `/tentang-kami`, dan `/kontak`. Kelimanya menampilkan informasi layanan CV MR Express dan sudah menandai dirinya `index, follow`.
- Jangan masukkan `/login` dan `/setup` (halaman akun, keduanya `noindex, nofollow`), maupun `/dashboard`, `/transaksi`, `/laporan`, `/rekening`, `/transfer`, `/import`, `/audit`, `/pengguna`, atau `/profil`.
- Jangan masukkan alamat Supabase, tautan unduhan laporan, parameter filter, saldo, transaksi, nama pengguna, email, atau isi audit.
- Halaman keuangan tetap membutuhkan login dan mengikuti pembatasan akses yang sudah ada. Sitemap dan `noindex` bukan pengganti keamanan akses.

## 1. Tentukan alamat publik

Publikasikan situs pada alamat resmi yang akan dipakai seterusnya. Pastikan halaman utama bisa dibuka tanpa login. Gunakan alamat HTTPS yang benar, termasuk pilihan dengan atau tanpa `www`; keduanya berbeda untuk verifikasi URL-prefix.

Setelah alamat tersedia, minta Lovable: “Tambahkan sitemap untuk alamat publik resmi situs ini, hanya halaman publik, lalu siapkan verifikasi Google Search Console.”

Sitemap akan tersedia di `/sitemap.xml` dan berisi alamat lengkap halaman utama pada domain resmi. Tidak perlu menambahkan `lastmod` kecuali ada tanggal perubahan konten yang benar-benar khusus untuk halaman tersebut; jangan gunakan tanggal pembuatan sitemap atau publikasi sebagai penggantinya.

## 2. Verifikasi kepemilikan di Google

1. Buka [Google Search Console](https://search.google.com/search-console/) dengan akun Google yang akan mengelola CV MR Express.
2. Pilih **Tambahkan properti → Awalan URL (URL-prefix)**.
3. Masukkan alamat HTTPS resmi situs, diakhiri `/`.
4. Pilih metode **Tag HTML** dan salin tag `google-site-verification` yang diberikan Google.
5. Berikan tag tersebut kepada Lovable agar dipasang di bagian kepala HTML halaman utama. Jangan mengirim password Google, cookie, atau token akses.
6. Publikasikan perubahan dan pastikan tag muncul pada **sumber HTML halaman utama yang sudah tayang**, bukan hanya di pratinjau.
7. Klik **Verifikasi** di Search Console setelah tag benar-benar tayang. Pertahankan tag setelah verifikasi berhasil.

Alternatif: minta Lovable menghubungkan Google Search Console dan menjalankan verifikasi melalui persetujuan resmi. Panduan ini tidak otomatis menghubungkan akun atau memverifikasi situs.

Properti URL-prefix mencakup semua halaman di bawah alamat HTTPS dan hostname yang sama, menyediakan laporan pencarian, serta mendukung pengiriman sitemap. Verifikasi DNS hanya diperlukan jika memilih properti **Domain** yang lebih luas untuk semua protokol dan subdomain; itu tidak wajib untuk situs ini.

## 3. Kirim sitemap setelah tayang

1. Buka alamat resmi situs diikuti `/sitemap.xml` dan pastikan XML bisa diakses tanpa login.
2. Pastikan setiap alamat di XML menggunakan domain resmi dan hanya mencantumkan halaman publik.
3. Di Search Console, pilih properti yang sudah diverifikasi untuk alamat tersebut.
4. Buka **Peta situs (Sitemaps)**, masukkan `sitemap.xml`, lalu klik **Kirim**.
5. Periksa status pemrosesan. Jangan menganggap jumlah URL yang dikirim sebagai bukti halaman sudah terindeks.

Pengiriman ulang hanya diperlukan ketika isi sitemap berubah, bukan setiap hari.

## 4. Periksa pencarian tanpa membuka data keuangan

- Gunakan **Inspeksi URL** untuk halaman utama. Jika diperlukan, pilih **Minta pengindeksan** langsung di Search Console; permintaan ini tidak menjamin indeks atau peringkat.
- Pantau laporan **Pengindeksan halaman** dan **Performa** untuk kata pencarian seperti “cv mr express”. Pemrosesan Google bisa memerlukan waktu.
- Jangan meminta pengindeksan halaman keuangan atau menghapus `noindex` untuk mendapatkan kunjungan.
- Jangan membuka akses Supabase atau mengubah aturan keamanan agar Google dapat membaca laporan.
- Memiliki sitemap dan verifikasi tidak menjamin muncul di hasil pencarian atau posisi tertentu.

## Pemeriksaan sebelum selesai

- Alamat resmi sudah tersedia dan halaman utama dapat diakses.
- Tag verifikasi benar-benar terdapat pada HTML halaman utama yang tayang.
- Google menyatakan kepemilikan terverifikasi.
- Sitemap XML tayang pada domain yang sama, hanya berisi halaman publik, dan telah dikirim.
- Halaman keuangan dan penyiapan akun tetap tidak diindeks; akses data tetap dibatasi seperti sebelumnya.

Langkah yang membutuhkan alamat resmi belum dapat dijalankan pada kondisi proyek saat ini.