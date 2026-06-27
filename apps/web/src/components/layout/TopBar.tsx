import React from 'react';
import { useAuth, useClerk } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  clerkSignInPath,
  isClerkEnabled,
} from '../../lib/clerk';
import {
  Bell,
  ChevronDown,
  Globe2,
  HelpCircle,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  User,
} from 'lucide-react';
import { useISOStore } from '../../store/useISOStore';
import { useAuthStore } from '../../store/useAuthStore';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  route: string;
}

interface TopBarProps {
  onToggleSidebar: () => void;
  sidebarCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onToggleSidebar,
  sidebarCollapsed,
  onToggleCollapsed,
}) => {
  const navigate = useNavigate();
  const clerk = useClerk();
  const { isSignedIn } = useAuth();
  const settings = useISOStore((state) => state.settings);
  const alerts = useISOStore((state) => state.alerts);
  const documents = useISOStore((state) => state.documents);
  const tasks = useISOStore((state) => state.tasks);
  const audits = useISOStore((state) => state.audits);
  const users = useISOStore((state) => state.users);
  const chatThreads = useISOStore((state) => state.chatThreads);
  const emailTemplates = useISOStore((state) => state.emailTemplates);
  const emailCampaigns = useISOStore((state) => state.emailCampaigns);
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [alertsOpen, setAlertsOpen] = React.useState(false);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);

  React.useEffect(() => {
    const handleWindowClick = () => {
      setAlertsOpen(false);
      setUserMenuOpen(false);
      setSearchOpen(false);
    };

    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

  const stopClick: React.MouseEventHandler<HTMLDivElement | HTMLButtonElement> = (event) => {
    event.stopPropagation();
  };

  const searchResults = React.useMemo<SearchResult[]>(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return [];
    }

    const results: SearchResult[] = [
      ...documents
        .filter((item) => item.title.toLowerCase().includes(normalized))
        .map((item) => ({
          id: `document-${item.id}`,
          title: item.title,
          subtitle: `Documento · ${item.standard}`,
          route: `/documents?q=${encodeURIComponent(item.title)}`,
        })),
      ...tasks
        .filter(
          (item) =>
            item.title.toLowerCase().includes(normalized) ||
            item.description.toLowerCase().includes(normalized)
        )
        .map((item) => ({
          id: `task-${item.id}`,
          title: item.title,
          subtitle: `Tarea · ${item.assignedTo}`,
          route: `/tasks?q=${encodeURIComponent(item.title)}`,
        })),
      ...audits
        .filter(
          (item) =>
            item.type.toLowerCase().includes(normalized) ||
            item.standard.toLowerCase().includes(normalized) ||
            item.findings.some((finding) =>
              finding.description.toLowerCase().includes(normalized)
            )
        )
        .map((item) => ({
          id: `audit-${item.id}`,
          title: `${item.type === 'internal' ? 'Auditoria interna' : 'Auditoria externa'} ${item.standard}`,
          subtitle: `Auditoria · ${item.status}`,
          route: `/audits?q=${encodeURIComponent(item.standard)}`,
        })),
      ...alerts
        .filter(
          (item) =>
            item.title.toLowerCase().includes(normalized) ||
            item.description.toLowerCase().includes(normalized)
        )
        .map((item) => ({
          id: `alert-${item.id}`,
          title: item.title,
          subtitle: 'Alerta del sistema',
          route: '/alerts',
        })),
      ...users
        .filter(
          (item) =>
            item.name.toLowerCase().includes(normalized) ||
            item.email.toLowerCase().includes(normalized)
        )
        .map((item) => ({
          id: `user-${item.id}`,
          title: item.name,
          subtitle: `Usuario · ${item.email}`,
          route: `/settings/users?q=${encodeURIComponent(item.name)}`,
        })),
      ...chatThreads
        .filter((thread) =>
          thread.messages.some((message) => message.content.toLowerCase().includes(normalized))
        )
        .map((thread) => ({
          id: `chat-${thread.id}`,
          title: 'Conversacion interna',
          subtitle: `${thread.messages[thread.messages.length - 1]?.content ?? 'Sin mensajes'}`,
          route: '/chat',
        })),
      ...emailTemplates
        .filter(
          (template) =>
            template.name.toLowerCase().includes(normalized) ||
            template.subject.toLowerCase().includes(normalized)
        )
        .map((template) => ({
          id: `template-${template.id}`,
          title: template.name,
          subtitle: 'Plantilla de comunicado',
          route: '/communications',
        })),
      ...emailCampaigns
        .filter((campaign) => campaign.name.toLowerCase().includes(normalized))
        .map((campaign) => ({
          id: `campaign-${campaign.id}`,
          title: campaign.name,
          subtitle: 'Envio masivo ejecutado',
          route: '/communications',
        })),
    ];

    return results.slice(0, 8);
  }, [alerts, audits, chatThreads, documents, emailCampaigns, emailTemplates, query, tasks, users]);

  const handleSearchSelect = (route: string) => {
    navigate(route);
    setSearchOpen(false);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (searchResults.length > 0) {
      handleSearchSelect(searchResults[0].route);
      return;
    }

    if (query.trim()) {
      navigate(`/documents?q=${encodeURIComponent(query.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    if (isClerkEnabled && clerk && isSignedIn) {
      await logout();
      await clerk.signOut({ redirectUrl: clerkSignInPath });
      return;
    }

    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex flex-col gap-4 px-4 py-4 md:px-6 xl:flex-row xl:items-center xl:justify-between xl:px-7">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-slate-700 lg:hidden"
            aria-label="Abrir menu lateral"
          >
            <Menu className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden rounded-lg border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-slate-700 lg:inline-flex"
            aria-label={sidebarCollapsed ? 'Expandir barra lateral' : 'Contraer barra lateral'}
          >
            {sidebarCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </button>

          <div>
            <p className="text-sm font-semibold text-slate-400">Panel de cumplimiento</p>
            <h2 className="text-[28px] font-extrabold text-slate-700">
              {settings.companyName || 'ISO Manager'}
            </h2>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
          <div className="relative" onClick={stopClick}>
            <form
              onSubmit={handleSearchSubmit}
              className="flex min-w-[290px] items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-400"
            >
              <Search className="h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar documentos, tareas, auditorias, chat o plantillas..."
                className="w-full border-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
                value={query}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
              />
            </form>

            {searchOpen && query.trim().length > 0 && (
              <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSearchSelect(result.route)}
                      className="block w-full rounded-xl px-3 py-3 text-left transition hover:bg-slate-50"
                    >
                      <p className="text-sm font-bold text-slate-700">{result.title}</p>
                      <p className="mt-1 text-xs text-slate-400">{result.subtitle}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl px-3 py-4 text-sm text-slate-500">
                    No se encontraron coincidencias para "{query}".
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-[#727cf5]/10 px-3 py-2 text-[#727cf5] md:flex">
              <Globe2 className="h-4 w-4" />
              <span className="text-sm font-bold uppercase tracking-wide">Entorno ISO</span>
            </div>

            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-slate-700"
              title="Ayuda"
            >
              <HelpCircle className="h-5 w-5" />
            </button>

            <div className="relative" onClick={stopClick}>
              <button
                type="button"
                onClick={() => setAlertsOpen((current) => !current)}
                className="relative rounded-full border border-slate-200 bg-white p-2.5 text-slate-500 transition hover:text-slate-700"
                aria-label="Ver alertas"
              >
                <Bell className="h-5 w-5" />
                {alerts.length > 0 && (
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#fa5c7c]" />
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[330px] rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between px-2 py-1">
                    <p className="text-sm font-extrabold text-slate-700">Alertas recientes</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/alerts');
                        setAlertsOpen(false);
                      }}
                      className="text-xs font-bold text-[#727cf5]"
                    >
                      Ver todas
                    </button>
                  </div>

                  <div className="space-y-2">
                    {alerts.slice(0, 4).map((alert) => (
                      <button
                        key={alert.id}
                        type="button"
                        onClick={() => {
                          navigate('/alerts');
                          setAlertsOpen(false);
                        }}
                        className="block w-full rounded-lg bg-slate-50 px-3 py-3 text-left transition hover:bg-slate-100"
                      >
                        <p className="text-sm font-bold text-slate-700">{alert.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{alert.description}</p>
                      </button>
                    ))}
                    {alerts.length === 0 && (
                      <div className="rounded-lg bg-slate-50 px-3 py-4 text-sm text-slate-500">
                        No hay alertas pendientes.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" onClick={stopClick}>
              <button
                type="button"
                onClick={() => setUserMenuOpen((current) => !current)}
                className="flex items-center gap-3 rounded-full border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-slate-300"
                aria-label="Abrir menu de usuario"
              >
                <div className="rounded-full bg-[#727cf5]/10 p-2 text-[#727cf5]">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{user?.name ?? 'Usuario'}</p>
                  <p className="text-xs capitalize text-slate-400">{user?.role ?? 'Sin rol'}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[230px] rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/settings/general');
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                    Ir a configuracion
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/');
                      setUserMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    <User className="h-4 w-4" />
                    Ver panel principal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      void handleLogout();
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-semibold text-[#fa5c7c] transition hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
