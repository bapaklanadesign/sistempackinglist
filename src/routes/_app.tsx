import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftRight, ChartNoAxesColumn, ChevronDown, ClipboardList, Contact, FileSpreadsheet, FileText, History, LayoutGrid, List, LogOut, Menu, Package, Printer, ScrollText, Ship, Truck, UserCircle, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel, useAuth, type Role } from "@/lib/auth";
import { areaOf, canBookkeeping, canOpen, canPacking, homeFor } from "@/lib/access";
import { toast } from "sonner";
import { useRealtimeSync, useRtStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_app")({ head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }), component: AppLayout });

const bookkeepingSuper = [
  { to: "/dashboard-pembukuan", label: "Dashboard Pembukuan", icon: LayoutGrid },
  { to: "/transaksi", label: "Semua Transaksi", icon: List },
  { to: "/laporan", label: "Laporan Gabungan", icon: FileText },
  { to: "/rekening", label: "Rekening & Saldo Awal", icon: Wallet },
] as const;
const bookkeepingAdmin = [
  { to: "/dashboard-pembukuan", label: "Dashboard Pembukuan", icon: LayoutGrid },
  { to: "/transaksi", label: "Transaksi", icon: List },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/import", label: "Import Excel", icon: FileSpreadsheet },
  { to: "/laporan", label: "Laporan", icon: FileText },
] as const;
const packingMenu = [
  { to: "/dashboard-packing", label: "Dashboard Packing List", icon: LayoutGrid },
  { to: "/packing-list", label: "Data Packing List", icon: ClipboardList },
  { to: "/barang", label: "Barang", icon: Package },
  { to: "/pengirim-penerima", label: "Pengirim & Penerima", icon: Contact },
  { to: "/kapal-pelabuhan", label: "Kapal & Pelabuhan", icon: Ship },
  { to: "/pengiriman", label: "Pengiriman", icon: Truck },
  { to: "/manifest", label: "Manifest Kapal", icon: ScrollText },
  { to: "/cetak-pdf", label: "Cetak PDF", icon: Printer },
  { to: "/laporan-packing", label: "Laporan & Aktivitas", icon: ChartNoAxesColumn },
] as const;
const adminTools = [
  { to: "/pengguna", label: "Manajemen Pengguna", icon: Users },
  { to: "/audit", label: "Audit Log", icon: History },
] as const;
type MenuItem = { to: string; label: string; icon: typeof List };
const navCls = (active: boolean) => cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-sidebar-accent", active && "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary");
const isActive = (path: string, to: string) => path === to || (to === "/packing-list" && path.startsWith("/packing-list/"));
const tagline: Record<Role, string> = { super_admin: "PEMBUKUAN & LOGISTIK", admin1: "PEMBUKUAN", admin2: "PEMBUKUAN", admin_packing: "PACKING LIST & LOGISTIK" };

function MenuLinks({ items, path }: { items: readonly MenuItem[]; path: string }) {
  return <>{items.map((m) => <Link key={m.to} to={m.to} className={navCls(isActive(path, m.to))}><m.icon className="h-4 w-4" />{m.label}</Link>)}</>;
}
const Section = ({ children }: { children: ReactNode }) => <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-widest opacity-60">{children}</p>;

/** Super Admin can jump between modules without signing in again. */
function ModuleSwitch({ path }: { path: string }) {
  const area = areaOf(path);
  const items = [
    { to: "/dashboard", label: "Utama", on: path === "/dashboard" },
    { to: "/dashboard-pembukuan", label: "Pembukuan", on: area === "bookkeeping" || path === "/rekening" },
    { to: "/dashboard-packing", label: "Packing", on: area === "packing" },
  ] as const;
  return (
    <div role="navigation" aria-label="Pindah modul" className="mx-3 mb-2 grid grid-cols-3 gap-1 rounded-lg bg-sidebar-accent/60 p-1">
      {items.map((i) => <Link key={i.to} to={i.to} className={cn("rounded-md px-1 py-1.5 text-center text-[11px] font-bold transition-colors", i.on ? "bg-sidebar-primary text-sidebar-primary-foreground shadow" : "hover:bg-sidebar-accent")}>{i.label}</Link>)}
    </div>
  );
}

function AppLayout() {
  const { ready, session, role, roleError, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const area = areaOf(path);
  const inPacking = area === "packing";
  const inBook = area === "bookkeeping" || area === "ledger" || path === "/rekening";
  const [plOpen, setPlOpen] = useState(true);
  const [bkOpen, setBkOpen] = useState(true);
  useEffect(() => { if (inPacking) setPlOpen(true); if (inBook) setBkOpen(true); }, [inPacking, inBook]);
  useRealtimeSync(!!role);
  const allowed = canOpen(role, path);

  useEffect(() => { if (ready && !session) nav({ to: "/login", replace: true }); }, [ready, session, nav]);
  // Direct URLs outside the role's modules go back to the role's own dashboard (data stays protected by RLS).
  useEffect(() => {
    if (!ready || !role || allowed) return;
    toast.error("Halaman ini tidak tersedia untuk peran Anda");
    nav({ to: homeFor(role), replace: true });
  }, [ready, role, allowed, nav]);
  useEffect(() => setOpen(false), [path]);

  const logout = async () => { await signOut(); nav({ to: "/login", replace: true }); };

  if (!ready || !session) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat sesi...</div>;
  if (!role)
    return (
      <div className="grid min-h-screen place-items-center p-4 text-center">
        <div><p className="font-semibold text-destructive">{roleError ?? "Peran tidak ditemukan"}</p><Button className="mt-4" onClick={logout}>Keluar</Button></div>
      </div>
    );
  if (!allowed) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Mengalihkan...</div>;
  const isSuper = role === "super_admin";

  return (
    <div className="flex min-h-screen w-full">
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="px-5 py-5">
          <p className="truncate text-sm font-extrabold tracking-wide">MR EXPRESS</p>
          <p className="text-[9px] font-semibold tracking-widest opacity-70">{tagline[role]}</p>
        </div>
        <p className="px-5 pb-2 text-sm font-bold text-sidebar-accent-foreground">{roleLabel[role]}</p>
        {isSuper && <ModuleSwitch path={path} />}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {isSuper && <Link to="/dashboard" className={navCls(path === "/dashboard")}><LayoutGrid className="h-4 w-4" />Dashboard Utama</Link>}
          {canBookkeeping(role) && (isSuper ? (
            <Group label="Pembukuan" icon={Wallet} open={bkOpen} onToggle={() => setBkOpen((o) => !o)}><MenuLinks items={bookkeepingSuper} path={path} /></Group>
          ) : (<><Section>PEMBUKUAN</Section><MenuLinks items={bookkeepingAdmin} path={path} /></>))}
          {canPacking(role) && (isSuper ? (
            <Group label="Packing List" icon={Package} open={plOpen} onToggle={() => setPlOpen((o) => !o)}><MenuLinks items={packingMenu} path={path} /></Group>
          ) : (<><Section>PACKING LIST</Section><MenuLinks items={packingMenu} path={path} /></>))}
          {isSuper && <><Section>ADMINISTRASI</Section><MenuLinks items={adminTools} path={path} /></>}
          <Section>AKUN</Section>
          <Link to="/profil" className={navCls(path === "/profil")}><UserCircle className="h-4 w-4" />Profil</Link>
        </nav>
        <p className="px-6 pb-1 text-[9px] font-semibold tracking-widest opacity-50">FAST · SAFE · RELIABLE</p>
        <button onClick={() => setConfirmLogout(true)} className="flex items-center gap-3 border-t border-sidebar-border px-6 py-4 text-sm hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />Keluar
        </button>
        <ConfirmDialog open={confirmLogout} onOpenChange={setConfirmLogout} title="Keluar dari akun?" description="Anda akan keluar dari MR Express dan harus masuk kembali untuk mengakses aplikasi." confirmLabel="Ya, keluar" onConfirm={logout} />
      </aside>
      <div className="min-w-0 flex-1"><Outlet /></div>
      <Button variant="outline" size="icon" aria-label="Menu" onClick={() => setOpen(true)} className="fixed left-3 top-3 z-20 lg:hidden"><Menu className="h-5 w-5" /></Button>
    </div>
  );
}

function Group({ label, icon: Icon, open, onToggle, children }: { label: string; icon: typeof List; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <>
      <button type="button" aria-expanded={open} onClick={onToggle} className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold hover:bg-sidebar-accent">
        <Icon className="h-4 w-4" /><span className="flex-1 text-left">{label}</span><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2">{children}</div>}
    </>
  );
}

function LiveBadge() {
  const s = useRtStatus();
  const map = { live: ["bg-success-soft text-success", "Realtime aktif"], connecting: ["bg-muted text-muted-foreground", "Menghubungkan..."], offline: ["bg-danger-soft text-destructive", "Realtime terputus"] } as const;
  return <span className={cn("flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-bold", map[s][0])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{map[s][1]}</span>;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <header className="grid min-w-0 gap-2 border-b bg-card px-4 py-3 pl-16 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center lg:pl-6">
      <div className="min-w-0">
        <h1 className="break-words text-lg font-bold sm:text-xl">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end"><LiveBadge />{children}</div>
    </header>
  );
}
