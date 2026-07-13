import React from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { usesClerkAuthentication } from './lib/authConfig';
import {
  clerkJwtTemplate,
  clerkSignInPath,
  isClerkEnabled,
  resolveClerkRole,
} from './lib/clerk';
import { useAuthConfig } from './hooks/useAuthConfig';
import { syncExternalUserSession } from './lib/api';
import { fetchCurrentClerkUser } from './lib/clerkDirectoryApi';
import { registerClerkTokenProvider } from './lib/clerkSession';
import { useAuthStore } from './store/useAuthStore';

const Dashboard = React.lazy(() =>
  import('./pages/Dashboard').then((module) => ({ default: module.Dashboard }))
);
const Documents = React.lazy(() =>
  import('./pages/Documents').then((module) => ({ default: module.Documents }))
);
const Tasks = React.lazy(() =>
  import('./pages/Tasks').then((module) => ({ default: module.Tasks }))
);
const Automation = React.lazy(() =>
  import('./pages/Automation').then((module) => ({ default: module.Automation }))
);
const Audits = React.lazy(() =>
  import('./pages/Audits').then((module) => ({ default: module.Audits }))
);
const Standards = React.lazy(() =>
  import('./pages/Standards').then((module) => ({ default: module.Standards }))
);
const StandardDetail = React.lazy(() =>
  import('./pages/StandardDetail').then((module) => ({ default: module.StandardDetail }))
);
const Evidences = React.lazy(() =>
  import('./pages/Evidences').then((module) => ({ default: module.Evidences }))
);
const Contracts = React.lazy(() =>
  import('./pages/Contracts').then((module) => ({ default: module.Contracts }))
);
const Calendar = React.lazy(() =>
  import('./pages/Calendar').then((module) => ({ default: module.Calendar }))
);
const Alerts = React.lazy(() =>
  import('./pages/Alerts').then((module) => ({ default: module.Alerts }))
);
const Chat = React.lazy(() =>
  import('./pages/Chat').then((module) => ({ default: module.Chat }))
);
const Communications = React.lazy(() =>
  import('./pages/Communications').then((module) => ({ default: module.Communications }))
);
const Settings = React.lazy(() =>
  import('./pages/Settings').then((module) => ({ default: module.Settings }))
);
const SettingsGeneral = React.lazy(() =>
  import('./pages/settings/SettingsGeneral').then((module) => ({
    default: module.SettingsGeneral,
  }))
);
const SettingsNotifications = React.lazy(() =>
  import('./pages/settings/SettingsNotifications').then((module) => ({
    default: module.SettingsNotifications,
  }))
);
const SettingsUsers = React.lazy(() =>
  import('./pages/settings/SettingsUsers').then((module) => ({ default: module.SettingsUsers }))
);
const Login = React.lazy(() =>
  import('./pages/Login').then((module) => ({ default: module.Login }))
);

const RouteFallback: React.FC<{ label: string }> = ({ label }) => (
  <div className="rounded-[28px] border border-dashed border-app-border bg-app-surface py-14 text-center shadow-panel">
    <div className="mx-auto max-w-md">
      <p className="text-lg font-extrabold text-app-text">Cargando {label}...</p>
      <p className="mt-2 text-sm text-app-muted">Estamos preparando el módulo para continuar.</p>
    </div>
  </div>
);

const withSuspense = (node: React.ReactNode, label: string) => (
  <React.Suspense fallback={<RouteFallback label={label} />}>{node}</React.Suspense>
);

const AuthModeFallback: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
    <div className="w-full max-w-xl rounded-3xl border border-app-border bg-app-surface p-8 text-center shadow-floating">
      <h2 className="text-2xl font-extrabold text-app-text">Estado de autenticación</h2>
      <p className="mt-3 text-sm text-app-muted">{message}</p>
    </div>
  </div>
);

const LocalProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const initialize = useAuthStore((state) => state.initialize);

  React.useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-slate-500">
        Cargando sesion...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={clerkSignInPath} replace />;
  }

  return <>{children}</>;
};

const ClerkSessionSync: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  const syncSession = useAuthStore((state) => state.syncSession);

  React.useEffect(() => {
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      registerClerkTokenProvider(null);
      return;
    }

    registerClerkTokenProvider(() =>
      clerkJwtTemplate ? getToken({ template: clerkJwtTemplate }) : getToken()
    );

    return () => {
      registerClerkTokenProvider(null);
    };
  }, [getToken, isLoaded, isSignedIn]);

  React.useEffect(() => {
    let mounted = true;

    const sync = async () => {
      if (!isLoaded) {
        return;
      }

      const shouldUseClerkAuth = isClerkEnabled && (await usesClerkAuthentication());
      if (!shouldUseClerkAuth) {
        syncSession(null, null);
        return;
      }

      if (!isSignedIn || !user) {
        syncSession(null, null);
        return;
      }

      const email = user.primaryEmailAddress?.emailAddress?.trim();
      if (!email) {
        syncSession(null, 'Tu cuenta de Clerk no tiene un correo principal disponible.');
        return;
      }

      try {
        const clerkUser = await fetchCurrentClerkUser();
        const nextUser = await syncExternalUserSession({
          externalId: clerkUser?.externalId ?? user.id,
          email: clerkUser?.email ?? email,
          name:
            clerkUser?.name ||
            user.fullName?.trim() ||
            [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
            email,
          role:
            clerkUser?.role ??
            resolveClerkRole(
              user.publicMetadata as Record<string, unknown> | undefined,
              user.unsafeMetadata as Record<string, unknown> | undefined
            ),
        });

        if (mounted) {
          syncSession(nextUser, null);
        }
      } catch (error) {
        if (mounted) {
          syncSession(
            null,
            error instanceof Error ? error.message : 'No fue posible sincronizar tu sesión.'
          );
        }
      }
    };

    void sync();

    return () => {
      mounted = false;
    };
  }, [isLoaded, isSignedIn, syncSession, user]);

  return null;
};

const ClerkProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initialized = useAuthStore((state) => state.initialized);
  const user = useAuthStore((state) => state.user);
  const error = useAuthStore((state) => state.error);

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-slate-500">
        Cargando sesion...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-app-surface p-8 text-center shadow-floating">
          <h2 className="text-2xl font-extrabold text-slate-700">No fue posible iniciar la sesión</h2>
          <p className="mt-3 text-sm text-rose-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to={clerkSignInPath} replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC<{ protectedRoute: React.FC<{ children: React.ReactNode }> }> = ({
  protectedRoute: ProtectedRoute,
}) => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={withSuspense(<Login />, 'inicio de sesión')} />
      {clerkSignInPath !== '/login' ? (
        <Route path={clerkSignInPath} element={withSuspense(<Login />, 'inicio de sesión')} />
      ) : null}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={withSuspense(<Dashboard />, 'dashboard')} />
        <Route path="documents" element={withSuspense(<Documents />, 'documentos')} />
        <Route path="tasks" element={withSuspense(<Tasks />, 'tareas')} />
        <Route path="automation" element={withSuspense(<Automation />, 'automatización')} />
        <Route path="audits" element={withSuspense(<Audits />, 'auditorías')} />
        <Route path="standards" element={withSuspense(<Standards />, 'normas')} />
        <Route path="standards/:id" element={withSuspense(<StandardDetail />, 'detalle normativo')} />
        <Route path="evidences" element={withSuspense(<Evidences />, 'evidencias')} />
        <Route path="contracts" element={withSuspense(<Contracts />, 'contratos')} />
        <Route path="calendar" element={withSuspense(<Calendar />, 'calendario')} />
        <Route path="alerts" element={withSuspense(<Alerts />, 'alertas')} />
        <Route path="chat" element={withSuspense(<Chat />, 'chat')} />
        <Route
          path="communications"
          element={withSuspense(<Communications />, 'comunicaciones')}
        />
        <Route path="settings" element={withSuspense(<Settings />, 'configuración')}>
          <Route index element={<Navigate to="/settings/general" replace />} />
          <Route
            path="general"
            element={withSuspense(<SettingsGeneral />, 'configuración general')}
          />
          <Route
            path="notifications"
            element={withSuspense(<SettingsNotifications />, 'notificaciones')}
          />
          <Route path="users" element={withSuspense(<SettingsUsers />, 'usuarios')} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);

function App() {
  const { authConfig, loading, error } = useAuthConfig();

  if (loading) {
    return <AuthModeFallback message="Estamos validando el modo de autenticación del entorno." />;
  }

  if (error) {
    return <AuthModeFallback message={error} />;
  }

  if (!authConfig) {
    return <AuthModeFallback message="No fue posible resolver la autenticación del entorno." />;
  }

  if (authConfig.mode === 'disabled') {
    return (
      <AuthModeFallback message="La autenticación de la aplicación está deshabilitada por configuración en este entorno." />
    );
  }

  if (authConfig.mode === 'clerk') {
    if (!isClerkEnabled) {
      return (
        <AuthModeFallback message="El backend requiere Clerk, pero el frontend no tiene configurada la integración pública necesaria para iniciar sesión." />
      );
    }

    return (
      <>
        <ClerkSessionSync />
        <AppRoutes protectedRoute={ClerkProtectedRoute} />
      </>
    );
  }

  return <AppRoutes protectedRoute={LocalProtectedRoute} />;
}

export default App;
