<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep audit presentation formatting in `src/lib/audit-display.ts`; render the existing read-only Supabase audit query as a desktop table and mobile records without changing audit-writing logic.
- Keep Import Excel and Pengguna responsive presentation in their existing routes: mobile records and locally scrollable desktop tables share the same query results to preserve data and workflows.
- Share transaction action controls across transactions, reports, dashboard and transfer history; the audited delete RPC validates ledger access and removes both transfer sides atomically to preserve balances.
- Test deletion SQL with PGlite in an isolated Node test environment using the shipped migration; never delete user financial data for automated verification.
- Keep branding presentation in the shared login shell and sidebar; preserve semantic action icons so controls remain recognizable.
- Reuse one uploaded brand asset pointer across public navigation, login and sidebar, and derive locally served application icons from it to keep branding consistent.
- Keep financial pages authenticated and excluded from indexing; public brand metadata belongs on public content routes, with canonical paths relative until a public domain is available.
- All public pages (home, Layanan, Rute, Tentang, Kontak, login/setup shell, 404) share the scoped `journey-site` theme and the header/footer/hero/CTA components in `src/components/site`; shipping facts (routes, ports, WhatsApp) live in `src/lib/public-shipping.ts`. Keep Ledger login at /login and the theme scoped so public work cannot alter financial styling or auth behavior.
- Load the homepage WebGL2 scroll journey engine only after hydration and dispose its animation loop, textures and context on navigation; keep the first footage frame as the SSR/no-WebGL fallback so browser-only rendering stays out of SSR.
- Keep journey timing (stage ratios, frame keys, caption windows) in the pure shared module and footage frames as CDN pointers listed in one ordered module; this keeps the engine, captions and tests in sync.
- Packing List reuses the existing pl_* tables: header+items save and status changes go only through the save_packing_list / set_packing_list_status RPCs (triggers keep totals, history and activity logs), deletes are Super Admin-only RLS, and all PL queries live under the ["pl"] cache key refreshed by the shared realtime hook; this keeps the bookkeeping roles and audit untouched.
- Test Packing List SQL rules in PGlite against the fixture copy of the live pl_* schema plus shipped migrations; never create or delete real Packing List data for verification.
- Dashboard visuals go through `src/components/charts` (StatCard counters, TrendChart, BarsChart, DonutChart, PeriodTabs) with pure bucketing/trend/format math in `src/lib/chart-logic.ts`; looping counters share one requestAnimationFrame clock that pauses off-screen, on hidden tabs and for reduced motion, so pages stay consistent and light on Android.
