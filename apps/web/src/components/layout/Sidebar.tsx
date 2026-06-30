import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { BrandLockup, BrandMark } from '../brand/Brand';
import { preloadRoute } from '../../lib/routePreload';
import {
  AlertCircle,
  BellRing,
  Calendar,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  FileCheck2,
  FileText,
  Files,
  LayoutDashboard,
  Mail,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users2,
} from 'lucide-react';

const singleItems = [{ to: '/', icon: LayoutDashboard, label: 'Inicio' }];

const groups = [
  {
    id: 'dependencies',
    label: 'Dependencias',
    items: [
      { to: '/documents', icon: FileText, label: 'Gestión documental' },
      { to: '/tasks', icon: CheckSquare, label: 'Tareas' },
      { to: '/audits', icon: ClipboardList, label: 'Auditorías' },
      { to: '/standards', icon: Files, label: 'Normas' },
      { to: '/evidences', icon: FileCheck2, label: 'Evidencias' },
      { to: '/contracts', icon: FileText, label: 'Contratos' },
      { to: '/calendar', icon: Calendar, label: 'Calendario' },
      { to: '/alerts', icon: AlertCircle, label: 'Alertas' },
    ],
  },
  {
    id: 'collaboration',
    label: 'Colaboración',
    items: [
      { to: '/chat', icon: MessageSquare, label: 'Chat interno' },
      { to: '/communications', icon: Mail, label: 'Comunicados' },
    ],
  },
  {
    id: 'settings',
    label: 'Configuración',
    items: [
      { to: '/settings/general', icon: Settings, label: 'General' },
      { to: '/settings/notifications', icon: BellRing, label: 'Notificaciones' },
      { to: '/settings/users', icon: Users2, label: 'Usuarios' },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed,
}) => {
  const location = useLocation();
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({
    dependencies: true,
    collaboration: true,
    settings: true,
  });

  React.useEffect(() => {
    if (collapsed) return;
    setOpenGroups((current) => {
      const next = { ...current };
      groups.forEach((group) => {
        if (group.items.some((item) => location.pathname.startsWith(item.to))) {
          next[group.id] = true;
        }
      });
      return next;
    });
  }, [collapsed, location.pathname]);

  const renderLink = (
    to: string,
    Icon: React.ComponentType<{ className?: string }>,
    label: string
  ) => (
    <NavLink
      key={to}
      to={to}
      onClick={onCloseMobile}
      onMouseEnter={() => preloadRoute(to)}
      onFocus={() => preloadRoute(to)}
      onTouchStart={() => preloadRoute(to)}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `mb-1.5 flex items-center rounded-xl px-3 py-2.5 transition-all ${
          collapsed ? 'justify-center' : 'justify-between'
        } ${
          isActive
            ? 'bg-[#3f4d5f] text-white shadow-sm'
            : 'text-white/65 hover:bg-white/5 hover:text-white'
        }`
      }
    >
      <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
        <Icon className="h-[18px] w-[18px]" />
        {!collapsed && <span className="text-[14px] font-semibold">{label}</span>}
      </div>
    </NavLink>
  );

  return (
    <>
      {mobileOpen && (
        <button
          aria-label="Cerrar menu lateral"
          className="fixed inset-0 z-30 bg-slate-950/45 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col bg-[#313a46] text-slate-100 transition-all duration-200 lg:static lg:translate-x-0 ${
          collapsed ? 'lg:w-[92px]' : 'lg:w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="border-b border-white/5 px-4 py-5">
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-3 ${collapsed ? 'lg:justify-center' : ''}`}>
              {collapsed ? <BrandMark className="h-10 w-10" /> : <BrandLockup inverse />}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="hidden rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white lg:inline-flex"
                aria-label={collapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-2 text-white/60 transition hover:bg-white/5 hover:text-white lg:hidden"
                aria-label="Cerrar menu lateral"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          {!collapsed && (
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.28em] text-white/30">
              Navegación
            </p>
          )}

          <nav className={`${collapsed ? 'mt-1' : 'mt-4'}`}>
            {singleItems.map(({ to, icon: Icon, label }) => renderLink(to, Icon, label))}

            {groups.map((group) => {
              const isGroupActive = group.items.some((item) => location.pathname.startsWith(item.to));

              if (collapsed) {
                return (
                  <div key={group.id} className="mt-3">
                    {group.items.map(({ to, icon: Icon, label }) => renderLink(to, Icon, label))}
                  </div>
                );
              }

              return (
                <div key={group.id} className="mt-4">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenGroups((current) => ({ ...current, [group.id]: !current[group.id] }))
                    }
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition ${
                      isGroupActive ? 'bg-white/5 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <span className="text-[13px] font-bold uppercase tracking-[0.18em]">
                      {group.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 transition ${openGroups[group.id] ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {openGroups[group.id] && (
                    <div className="mt-2 pl-2">
                      {group.items.map(({ to, icon: Icon, label }) => renderLink(to, Icon, label))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};
