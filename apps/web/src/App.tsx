import React from 'react';
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom';
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
import { useAuthStore } from './store/useAuthStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
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
}

export default App;
