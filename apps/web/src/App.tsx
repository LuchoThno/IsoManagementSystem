import React from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
import { useAuth, useUser } from '@clerk/clerk-react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Dashboard } from './pages/Dashboard';
import { Documents } from './pages/Documents';
import { Tasks } from './pages/Tasks';
import { Audits } from './pages/Audits';
import { Calendar } from './pages/Calendar';
import { Alerts } from './pages/Alerts';
import { Chat } from './pages/Chat';
import { Communications } from './pages/Communications';
import { Settings } from './pages/Settings';
import { SettingsGeneral } from './pages/settings/SettingsGeneral';
import { SettingsNotifications } from './pages/settings/SettingsNotifications';
import { SettingsUsers } from './pages/settings/SettingsUsers';
import { Login } from './pages/Login';
import { clerkSignInPath, isClerkEnabled, resolveClerkRole } from './lib/clerk';
import { syncExternalUserSession } from './lib/api';
import { fetchCurrentClerkUser } from './lib/clerkDirectoryApi';
import { registerClerkTokenProvider } from './lib/clerkSession';
import { useAuthStore } from './store/useAuthStore';

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
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] text-slate-500">
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

    registerClerkTokenProvider(() => getToken());

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
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] text-slate-500">
        Cargando sesion...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-xl">
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
      <Route path="/login" element={<Login />} />
      {clerkSignInPath !== '/login' ? <Route path={clerkSignInPath} element={<Login />} /> : null}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="documents" element={<Documents />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="audits" element={<Audits />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="chat" element={<Chat />} />
        <Route path="communications" element={<Communications />} />
        <Route path="settings" element={<Settings />}>
          <Route index element={<Navigate to="/settings/general" replace />} />
          <Route path="general" element={<SettingsGeneral />} />
          <Route path="notifications" element={<SettingsNotifications />} />
          <Route path="users" element={<SettingsUsers />} />
        </Route>
      </Route>
    </Routes>
  </BrowserRouter>
);

function App() {
  if (isClerkEnabled) {
    return (
      <>
        <ClerkSessionSync />
        <AppRoutes protectedRoute={ClerkProtectedRoute} />
      </>
    );
  }

  return (
    <AppRoutes protectedRoute={LocalProtectedRoute} />
  );
}

export default App;
