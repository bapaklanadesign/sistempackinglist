import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowLeftRight, ChartNoAxesColumn, ChevronDown, ClipboardList, Contact, FileSpreadsheet, FileText, History, LayoutGrid, List, LogOut, Menu, Package, Printer, ScrollText, Ship, Truck, UserCircle, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { roleLabel, useAuth } from "@/lib/auth";
import { useRealtimeSync, useRtStatus } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";

export const Route = createFileRoute("/_app")({ ssr: false, head: () => ({ meta: [{ name: "robots", content: "noindex, nofollow" }] }), component: AppLayout });

const superMenu = [
  { to: "/transaksi", label: "Semua Transaksi", icon: List },
  { to: "/laporan", label: "Laporan Gabungan", icon: FileText },
  { to: "/rekening", label: "Rekening & Saldo Awal", icon: Wallet },
  { to: "/audit", label: "Audit Log", icon: History },
  { to: "/pengguna", label: "Pengguna", icon: Users },
  { to: "/profil", label: "Profil", icon: UserCircle },
] as const;
const adminMenu = [
  { to: "/transaksi", label: "Transaksi", icon: List },
  { to: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { to: "/import", label: "Import Excel", icon: FileSpreadsheet },
  { to: "/laporan", label: "Laporan", icon: FileText },
  { to: "/profil", label: "Profil", icon: UserCircle },
] as const;
// Packing List is shared by Super Admin, Admin 1 and Admin 2.
const packingMenu = [
  { to: "/packing-list", label: "Data Packing List", icon: ClipboardList },
  { to: "/barang", label: "Barang", icon: Package },
  { to: "/pengirim-penerima", label: "Pengirim & Penerima", icon: Contact },
  { to: "/kapal-pelabuhan", label: "Kapal & Pelabuhan", icon: Ship },
  { to: "/pengiriman", label: "Pengiriman", icon: Truck },
  { to: "/manifest", label: "Manifest Kapal", icon: ScrollText },
  { to: "/cetak-pdf", label: "Cetak PDF", icon: Printer },
  { to: "/laporan-packing", label: "Laporan & Aktivitas", icon: ChartNoAxesColumn },
] as const;
const navCls = (active: boolean) => cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all hover:bg-sidebar-accent", active && "bg-sidebar-primary font-semibold text-sidebar-primary-foreground shadow-md hover:bg-sidebar-primary");

function AppLayout() {
  const { ready, session, role, roleError, signOut } = useAuth();
  const nav = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const inPacking = packingMenu.some((m) => path === m.to || path.startsWith(`${m.to}/`));
  const [plOpen, setPlOpen] = useState(inPacking);
  useEffect(() => { if (inPacking) setPlOpen(true); }, [inPacking]);
  useRealtimeSync(!!role);

  useEffect(() => { if (ready && !session) nav({ to: "/login", replace: true }); }, [ready, session, nav]);
  useEffect(() => setOpen(false), [path]);

  const logout = async () => { await signOut(); nav({ to: "/login", replace: true }); };

  if (!ready || !session) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Memuat sesi...</div>;
  if (!role)
    return (
      <div className="grid min-h-screen place-items-center p-4 text-center">
        <div><p className="font-semibold text-destructive">{roleError ?? "Peran tidak ditemukan"}</p><Button className="mt-4" onClick={logout}>Keluar</Button></div>
      </div>
    );
  const menu = role === "super_admin" ? superMenu : adminMenu;

  return (
    <div className="flex min-h-screen w-full">
      {open && <div className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-sidebar text-sidebar-foreground transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full")}>
        <div className="px-5 py-5">
          <p className="truncate text-sm font-extrabold tracking-wide">MR EXPRESS</p>
          <p className="text-[9px] font-semibold tracking-widest opacity-70">PEMBUKUAN & LOGISTIK</p>
        </div>
        <p className="px-5 pb-2 text-sm font-bold text-sidebar-accent-foreground">{roleLabel[role]}</p>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          <Link to="/dashboard" className={navCls(path === "/dashboard")}><LayoutGrid className="h-4 w-4" />Dashboard Utama</Link>
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold tracking-widest opacity-60">PEMBUKUAN</p>
          {menu.map((m) => (
            <Link key={m.to} to={m.to} className={navCls(path === m.to)}><m.icon className="h-4 w-4" />{m.label}</Link>
          ))}
          <button type="button" aria-expanded={plOpen} onClick={() => setPlOpen((o) => !o)} className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold hover:bg-sidebar-accent">
            <Package className="h-4 w-4" /><span className="flex-1 text-left">Packing List</span><ChevronDown className={cn("h-4 w-4 transition-transform", plOpen && "rotate-180")} />
          </button>
          {plOpen && <div className="ml-4 space-y-1 border-l border-sidebar-border pl-2">
            {packingMenu.map((m) => (
              <Link key={m.to} to={m.to} className={navCls(path === m.to || (m.to === "/packing-list" && path.startsWith("/packing-list/")))}><m.icon className="h-4 w-4" />{m.label}</Link>
            ))}
          </div>}
        </nav>
        <p className="px-6 pb-1 text-[9px] font-semibold tracking-widest opacity-50">FAST · SAFE · RELIABLE</p>
        <button onClick={() => setConfirmLogout(true)} className="flex items-center gap-3 border-t border-sidebar-border px-6 py-4 text-sm hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />Keluar
        </button>
        <ConfirmDialog open={confirmLogout} onOpenChange={setConfirmLogout} title="Keluar dari akun?" description="Anda akan keluar dari MR Express Ledger dan harus masuk kembali untuk mengakses pembukuan." confirmLabel="Ya, keluar" onConfirm={logout} />
      </aside>
      <div className="min-w-0 flex-1"><Outlet /></div>
      <Button variant="outline" size="icon" aria-label="Menu" onClick={() => setOpen(true)} className="fixed left-3 top-3 z-20 lg:hidden"><Menu className="h-5 w-5" /></Button>
    </div>
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
