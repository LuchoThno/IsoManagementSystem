import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { fetchBootstrap } from '../../lib/api';
import { useISOStore } from '../../store/useISOStore';

export const DashboardLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false);
  const hydrate = useISOStore((state) => state.hydrate);
  const loading = useISOStore((state) => state.loading);
  const error = useISOStore((state) => state.error);
  const setLoading = useISOStore((state) => state.setLoading);
  const setError = useISOStore((state) => state.setError);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchBootstrap();
        if (mounted) {
          hydrate(data);
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
  }, [hydrate, setError, setLoading]);

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
          {loading ? (
            <div className="panel-card p-10 text-center text-slate-500">
              Cargando panel ISO Manager...
            </div>
          ) : error ? (
            <div className="panel-card border-red-200 bg-red-50 p-10 text-center text-red-700">
              {error}
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
};
