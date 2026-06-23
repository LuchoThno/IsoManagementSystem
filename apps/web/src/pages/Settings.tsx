import React from 'react';
import { BellRing, Building2, ChevronRight, ShieldCheck, Users2 } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

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
    description: 'Cuentas, roles y accesos locales',
  },
];

export const Settings: React.FC = () => {
  return (
    <div className="grid gap-6 xl:grid-cols-[290px_1fr]">
      <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              Configuración
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-slate-700">Actividades</h2>
            <p className="mt-2 text-sm text-slate-400">
              Navega por bloques funcionales independientes.
            </p>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          {sections.map(({ to, icon: Icon, title, description }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl border px-4 py-4 transition ${
                  isActive
                    ? 'border-[#727cf5]/25 bg-[#727cf5]/8'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`
              }
            >
              <div className="rounded-2xl bg-slate-100 p-3 text-slate-600">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-700">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{description}</p>
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
