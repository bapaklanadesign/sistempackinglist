# Roadmap
- [x] Replace the homepage with the uploaded scroll-driven CV MR Express journey (96 footage frames, captions, advantages, interactive 11-route map, about, WhatsApp CTA) while keeping site navigation, Login and the WhatsApp number; verified at 344px and 1280px with no page errors or overflow; 38 tests passed. Previous 3D harbor homepage, audio and day/night controls removed.
- [x] Add a homepage day/night selector with visible daytime sun and illuminated harbor lamps at night; preserve the running scene and audio; 23 tests passed, build OK and both modes verified in desktop/mobile browser screenshots.
- [x] Place both day/night controls in the homepage navbar on desktop and mobile; switches work without page errors or horizontal overflow.
- [x] Add 18 illustrative roadside company buildings using three shared CC0 models and a large “pelabuhan perak surabaya” sign; desktop/mobile screenshots verified, no page errors or failed assets, 20 regression tests passed and build OK; real-device frame rate unverified.
- [x] Add thin cargo-plane trails and looping uploaded harbor audio with autoplay fallback and sound control; desktop/mobile playback, looping, mute and navigation cleanup verified; 20 tests passed and build OK.
- [x] Replace only the public homepage with the uploaded scroll-driven Three.js harbor reference; animated trucks/cranes/water/ship and camera path verified at 344px and 1280px, with no overflow or browser errors. WhatsApp, services and Login navigation verified; Ledger unchanged; 30 regression tests passed and build OK.
- [x] Replace website brand logos, favicon, touch icon and application icons with the uploaded CV MR Express image; preserve functional control icons.
- [x] Restore deletion controls across Super Admin/Admin transactions, reports, dashboard and transfer history; sticky action columns keep controls accessible; live delete RPC removes transfer pairs atomically with required reasons and audit records; 37 tests passed, including 12 isolated PostgreSQL deletion tests; build OK.
- [ ] Verify signed-in deletion end-to-end on live transactions, reports and transfer history — external Supabase session unavailable; no user data was deleted during testing.
- [x] Adapt Import Excel (Admin) and Pengguna (Super Admin) for mobile and desktop with mobile records, contained desktop tables and a stacking user form; no data or permission changes; build OK and 21 tests passed.
- [ ] Verify signed-in Import Excel and Pengguna appearance on phone, tablet and desktop — automated browser checks redirect to login because the external Supabase session is unavailable.
- [x] Put Login in the shared navbar (desktop button + mobile menu item), add a login back link, confirm logout via dialog, and refresh public search preparation (index,follow on public pages, noindex on /login, guide updated); 30 tests passed, mobile menu and back link verified in browser. Logout dialog wired but not verified signed-in (no external session). XML sitemap still requires the official public URL.
- [x] Add reference-backed public CV MR Express landing and content pages; preserve Ledger at /login. Navbar, all images, WhatsApp target, Login and signed-out financial redirects verified at 344px and 1280px; 28 focused tests passed. No Supabase or financial logic changes.
- [x] Remove image logos from all shared website views; retain functional icons. Login verified in browser; sidebar logo removed from shared source.
- [x] Ensure every financial page explicitly excludes indexing; 11 routing tests passed and all nine financial pages redirect signed-out visitors to login.
- [x] Add Google Search Console verification guide for public CV MR Express pages; exclude account setup from indexing and preserve financial access controls.
- [ ] Create and validate public-only XML sitemap — blocked until an official public URL is available; never use the preview URL.
- [x] Adapt Super Admin dashboard for phone and desktop — restyled both dashboards to the reference "modern port" theme (navy sidebar, container-ship banner, stat cards, charts, account list, recent transactions, monthly summary donut); UI-only, no feature/logic changes; build OK, 38 tests passed. Signed-in visual check blocked: external Supabase session unavailable.
- [ ] Improve CV MR Express search metadata; identify publishing/indexing limitations.
- [x] Make Audit Log human-readable and mobile-friendly without changing stored history or system behavior; 9 tests passed and existing Supabase audit payloads inspected.
- [ ] Verify signed-in Audit Log appearance on desktop and phone — external Supabase session is unavailable for automated browser checks.
- [x] All pages on real Supabase data (dashboard, transaksi, transfer, import, laporan, rekening, audit, pengguna, profil)
- [x] Realtime badge + live updates
- [x] Review status per transaction (Belum Diperiksa / Cocok / Tidak Cocok), Super Admin marks it, audited
- [x] Laporan Gabungan: transaction table with filters (admin, date, account) + status marking + edit
- [x] Super Admin CRUD: Semua Transaksi (add/view/edit/delete), Laporan Gabungan (edit/delete), Rekening & Saldo Awal (add/edit/delete + saldo awal) — audited RPCs (create/delete_transaction, create/update/delete_bank_account) with delete confirmations; build OK, 38 tests passed. Signed-in browser check blocked: external Supabase session unavailable.
- [x] Remove image credit texts (ship photo, container illustration) from public footer — verified in browser.
- [x] User asked to connect a different Supabase project ("jonijiji239@gmail.com's Project") — project already connected to external Supabase (nywokuprwanjuwbtunrc); switching is self-service in Settings → General → External Supabase.

## Packing List integration
- [x] Audit existing Packing List tables, links and access rules
- [x] Restrict Packing List deletes to Super Admin; Admin 1/2 can view, create and edit
- [x] Build Data Packing List, Barang, Pengirim & Penerima, Kapal & Pelabuhan, Pengiriman, Manifest, Cetak PDF, Laporan & Aktivitas pages on real data
- [x] Add Packing List summary to Dashboard Utama with live refresh
- [x] Automated tests for roles, totals, status history and deletes (private test database)
- [ ] Click-through test of Packing List pages while signed in (create, items, status, manifest, PDF) for each role — automated sign-in unavailable for this external Supabase project

## Public site redesign
- [x] Apply the homepage design to Layanan, Rute Pengiriman, Tentang Kami, Kontak, Login, setup and 404 pages with a shared header, mobile menu and footer
- [ ] Confirm company facts written as placeholders: history, vision and mission, destination port names, office address — waiting on the owner

## Modern animated dashboard
- [x] Glass stat cards with looping 0 → value counters (Rupiah, kg, koli, m³) and up/down trend vs last month on Dashboard Utama, Laporan, Laporan Packing, Barang and Manifest
- [x] Gradient glowing line/area charts with day/week/month/year filter, gradient bar charts, spinning donut charts with centre percentage; all from existing database rows
- [x] Pause animations off-screen, on hidden tabs and for reduced motion; 112 tests passed
- [ ] View the signed-in dashboards with real data on phone and desktop — automated sign-in unavailable for this external Supabase project

## Static SPA + Firebase Hosting migration
- [x] Migrate TanStack Start SSR/Nitro to Vite React SPA (dist/index.html + dist/assets), Firebase Hosting config, self-hosted media, account creation via database functions; build, preview, deep-link refresh checks
- [ ] Remove temporary role-less check account spa-migration-check@example.invalid — deletion declined by user; awaiting approval

## Four-role access (Super Admin, Admin Laporan 1, Admin Laporan 2, Admin Packing List)
- [x] Audit login, database and RLS before changes
- [x] Add Admin Packing List role; Packing List data limited to Super Admin + Admin Packing List, bookkeeping to Super Admin + Admin Laporan 1/2 (RLS + RPC checks, verified per role against the live database)
- [x] Role-based redirect after login, sidebar per role, forbidden direct URLs redirect without rendering the page
- [x] User Management (Super Admin only): create, edit name/role, activate/deactivate, reset password; self role change and self-deactivation blocked
- [x] Tested all four roles in the browser with temporary QA accounts (now deactivated)
- [x] Separate dashboards per role; Super Admin module switcher without re-login
- [ ] Remove the 4 deactivated QA accounts (qa-*@mrexpress.test) — awaiting user approval to delete
