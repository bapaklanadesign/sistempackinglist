import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, WifiOff } from "lucide-react";

import { reportLovableError } from "../lib/lovable-error-reporting";
import { isChunkLoadError } from "../lib/chunk-load-error";
import { AuthProvider } from "../lib/auth";
import { Toaster } from "@/components/ui/sonner";
import { SiteShell } from "@/components/site/site-chrome";

function NotFoundComponent() {
  return (
    <SiteShell overlay={false}>
      <section className="s-404">
        <div className="j-center">
          <b>404</b>
          <h1 className="mt-4">Halaman tidak ditemukan</h1>
          <p className="j-lead">Halaman yang Anda cari tidak tersedia atau sudah dipindahkan.</p>
          <div className="j-cta justify-center">
            <Link to="/" className="j-btn">Kembali ke Beranda</Link>
            <Link to="/kontak" className="j-btn j-btn-ghost">Hubungi Kami</Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  const chunkError = isChunkLoadError(error);
  const [reloading, setReloading] = useState(false);
  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
      kind: chunkError ? "chunk_load" : "render",
    });
  }, [error, chunkError]);

  const retry = () => {
    setReloading(true);
    if (chunkError) {
      // The browser holds a stale module list; only a full reload fetches the new files.
      window.location.reload();
      return;
    }
    router.invalidate();
    reset();
    setReloading(false);
  };

  const Icon = chunkError ? WifiOff : AlertTriangle;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        role="alert"
        aria-live="assertive"
        className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm"
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight text-card-foreground">
          {chunkError ? "Halaman gagal dimuat" : "Terjadi kesalahan"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {chunkError
            ? "Sebagian file halaman tidak berhasil diunduh. Biasanya karena koneksi terputus atau aplikasi baru saja diperbarui. Muat ulang halaman untuk mengambil versi terbaru."
            : "Halaman ini tidak dapat ditampilkan. Silakan coba lagi atau kembali ke beranda."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={retry}
            disabled={reloading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${reloading ? "animate-spin" : ""}`} aria-hidden="true" />
            {chunkError ? "Muat ulang halaman" : "Coba lagi"}
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Kembali ke Beranda
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { title: "Pembukuan CV MR Express" },
      { name: "description", content: "Sistem pembukuan keuangan CV MR Express" },
      { name: "author", content: "CV MR Express" },
      { property: "og:title", content: "Pembukuan CV MR Express" },
      { property: "og:description", content: "Sistem pembukuan keuangan CV MR Express" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:site_name", content: "CV MR Express" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* SPA: route head() tags are rendered here and hoisted into <head> by React. */}
      <HeadContent />
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <AuthProvider>
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
