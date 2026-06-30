import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { fetchBootstrapShell } from '../../lib/api';
import { useISOStore } from '../../store/useISOStore';

export const DashboardLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const bootstrapped = useISOStore((state) => state.bootstrapped);
  const hydrateShell = useISOStore((state) => state.hydrateShell);
  const loading = useISOStore((state) => state.loading);
  const error = useISOStore((state) => state.error);
  const setLoading = useISOStore((state) => state.setLoading);
  const setError = useISOStore((state) => state.setError);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (!bootstrapped) {
          setLoading(true);
        }
        const data = await fetchBootstrapShell();
        if (mounted) {
          hydrateShell(data);
        }
      } catch {
        if (mounted) {
          setError('No fue posible cargar los datos iniciales del sistema.');
        }
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [bootstrapped, hydrateShell, setError, setLoading]);

  return (
    <div className="min-h-screen bg-[#eef2f7] lg:flex">
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
      />
      <div className="flex-1 lg:min-w-0">
        <TopBar
          onToggleSidebar={() => setMobileSidebarOpen((current) => !current)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleCollapsed={() => setSidebarCollapsed((current) => !current)}
        />
        <main className="p-4 md:p-6 xl:p-7">
          {!bootstrapped && loading ? (
            <div className="panel-card p-10 text-center text-slate-500">
              Cargando panel ISO Manager...
            </div>
          ) : !bootstrapped && error ? (
            <div className="panel-card border-red-200 bg-red-50 p-10 text-center text-red-700">
              {error}
            </div>
          ) : (
            <div className="space-y-4">
              {error ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {error}
                </div>
              ) : null}
              <Outlet />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
