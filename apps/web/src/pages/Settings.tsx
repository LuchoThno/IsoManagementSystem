import React from 'react';
import { BellRing, Building2, ChevronRight, ShieldCheck, Users2 } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useUIPermissions } from '../hooks/useUIPermissions';

const sections = [
  {
    to: '/settings/general',
    icon: Building2,
    title: 'General',
    description: 'Empresa, idioma y normas activas',
  },
  {
    to: '/settings/notifications',
    icon: BellRing,
    title: 'Notificaciones',
    description: 'Canales y recordatorios del sistema',
  },
  {
    to: '/settings/users',
    icon: Users2,
    title: 'Usuarios',
    description: 'Cuentas, roles y accesos del sistema',
  },
];

export const Settings: React.FC = () => {
  const { canAccessUsersPanel } = useUIPermissions();
  const visibleSections = React.useMemo(
    () => sections.filter((section) => section.to !== '/settings/users' || canAccessUsersPanel),
    [canAccessUsersPanel]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[290px_1fr]">
      <aside className="rounded-[28px] border border-app-border bg-app-surface p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="app-icon-chip">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-app-muted">
              Configuración
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-app-text">Actividades</h2>
            <p className="mt-2 text-sm text-app-muted">
              Navega por bloques funcionales independientes.
            </p>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          {visibleSections.map(({ to, icon: Icon, title, description }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                  isActive
                    ? 'border-app-primary/25 bg-app-primary/10'
                    : 'border-app-border hover:border-slate-300 hover:bg-app-surface-alt'
                }`
              }
            >
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-app-text">{title}</p>
                <p className="mt-1 text-xs text-app-muted">{description}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </NavLink>
          ))}
        </nav>
      </aside>

      <section className="min-w-0">
        <Outlet />
      </section>
    </div>
  );
};
