# Deploy CV MR Express ke Firebase Hosting

Aplikasi ini adalah React SPA statis (Vite). Tidak perlu server Node.js, SSR, atau Nitro.

## Langkah
1. `npm install`
2. `npm run build` → menghasilkan `dist/index.html`, `dist/assets/*`, `dist/media/*`
3. (opsional) `npm run preview` untuk mencoba hasil build di http://localhost:4173
4. Sekali saja: `npm install -g firebase-tools`, `firebase login`, lalu salin `.firebaserc.example` menjadi `.firebaserc` dan isi ID proyek Firebase Anda (atau `firebase use --add`).
5. `firebase deploy --only hosting`

`firebase.json` sudah berisi: folder publik `dist`, rewrite semua alamat ke `/index.html` (refresh halaman internal tidak 404), cache panjang untuk `/assets` dan `/media`, dan `index.html` tanpa cache.

## Supabase
- Frontend hanya memakai publishable/anon key (`src/integrations/supabase/client.ts`). Kunci service_role tidak dipakai di frontend.
- Tambahkan domain Firebase Anda (mis. `https://<proyek>.web.app`) di Supabase → Authentication → URL Configuration bila nanti memakai tautan email (reset password / undangan).

## Media
Foto, bingkai animasi, suara, dan model 3D disalin ke `public/media`. Jika menambah media baru melalui Lovable, jalankan `npm run sync:media` di sandbox Lovable; build akan gagal dengan pesan jelas bila ada file media yang belum tersalin.
