import React from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { BrandLockup } from '../components/brand/Brand';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { clerkAfterSignInUrl, clerkSignInPath, clerkSignUpPath, isClerkEnabled } from '../lib/clerk';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const initialize = useAuthStore((state) => state.initialize);
  const { authConfig, loading: authConfigLoading, error: authConfigError } = useAuthConfig();
  const location = useLocation();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { isSignedIn } = useUser();
  const loginBackdropStyle = {
    backgroundImage:
      "linear-gradient(135deg, rgba(11,15,25,0.78) 0%, rgba(15,23,42,0.68) 32%, rgba(30,41,59,0.56) 100%), url('/login_iso.png')",
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } satisfies React.CSSProperties;
  const authMode = authConfig?.mode ?? (isClerkEnabled ? 'clerk' : 'demo');
  const usesClerkAuth = authMode === 'clerk';
  const authDisabled = authMode === 'disabled';

  React.useEffect(() => {
    if (!initialized && authMode === 'demo') {
      void initialize();
    }
  }, [authMode, initialize, initialized]);

  if (authConfigLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg text-slate-500">
        Validando autenticacion...
      </div>
    );
  }

  if (authConfigError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-app-bg px-4">
        <div className="w-full max-w-lg rounded-3xl border border-rose-200 bg-app-surface p-8 text-center shadow-floating">
          <h2 className="text-2xl font-extrabold text-slate-700">No fue posible cargar el acceso</h2>
          <p className="mt-3 text-sm text-rose-700">{authConfigError}</p>
        </div>
      </div>
    );
  }

  if (usesClerkAuth && isSignedIn) {
    return <Navigate to={clerkAfterSignInUrl} replace />;
  }

  if (usesClerkAuth && location.pathname !== clerkSignInPath) {
    return <Navigate to={clerkSignInPath} replace />;
  }

  if (authMode === 'demo' && initialized && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  if (authDisabled) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 py-8"
        style={loginBackdropStyle}
      >
        <div className="w-full max-w-2xl rounded-[36px] border border-white/15 bg-white/92 p-10 text-center shadow-2xl backdrop-blur">
          <BrandLockup />
          <h1 className="mt-6 text-3xl font-extrabold text-slate-700">
            Autenticación deshabilitada
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Este entorno tiene la autenticación deshabilitada por configuración. No es posible
            iniciar sesión hasta que el backend habilite un modo operativo.
          </p>
        </div>
      </div>
    );
  }

  if (usesClerkAuth) {
    return (
      <div
        className="flex min-h-screen items-center justify-center px-4 py-8"
        style={loginBackdropStyle}
      >
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[36px] border border-white/15 bg-white/92 shadow-2xl backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden px-10 py-12 text-white lg:block" style={loginBackdropStyle}>
            <BrandLockup inverse />
            <h1 className="mt-6 max-w-lg text-4xl font-extrabold leading-tight">
              Acceso corporativo con identidad visual ISO unificada
            </h1>
            <p className="mt-4 max-w-md text-white/80">
              Inicia sesión con Clerk usando la misma base de identidad del ecosistema Servasmar
              para entrar al panel ISO con una experiencia consistente y segura.
            </p>
            <div className="mt-10 max-w-md rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-sky-300" />
                <p className="font-bold">Inicio de sesión centralizado</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/80">
                Si tu cuenta ya existe en el ecosistema Servasmar, Clerk la reutilizará aquí y
                sincronizará tu perfil al entorno ISO.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center bg-white/88 p-6 md:p-10">
            <div className="w-full max-w-md">
              <div className="mb-6 lg:hidden">
                <BrandLockup />
              </div>
              {isClerkEnabled ? (
                <SignIn
                  path={clerkSignInPath}
                  routing="path"
                  signUpUrl={clerkSignUpPath}
                  fallbackRedirectUrl={clerkAfterSignInUrl}
                />
              ) : (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  El backend requiere Clerk, pero el frontend no tiene configurada la integración
                  pública necesaria para iniciar sesión.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-8"
      style={loginBackdropStyle}
    >
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[36px] border border-white/15 bg-white/92 shadow-2xl backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden px-10 py-12 text-white lg:block" style={loginBackdropStyle}>
          <BrandLockup inverse />
          <h1 className="mt-6 max-w-lg text-4xl font-extrabold leading-tight">
            Acceso al panel ISO con una experiencia visual más sólida
          </h1>
          <p className="mt-4 max-w-md text-white/80">
            Inicia sesión para administrar documentos, tareas, auditorías, usuarios y
            configuración del sistema en una interfaz alineada con la identidad ISO.
          </p>
          <div className="mt-10 max-w-md rounded-[28px] border border-white/15 bg-white/10 p-5 backdrop-blur">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-sky-300" />
              <p className="font-bold">Acceso local</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/80">
              Usa las credenciales configuradas para este entorno cuando el acceso local esté habilitado.
            </p>
          </div>
        </div>

        <div className="bg-white/88 p-8 md:p-10">
          <div className="mx-auto max-w-md">
            <div className="mb-6 lg:hidden">
              <BrandLockup />
            </div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Bienvenido
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-700">Iniciar sesion</h2>
            <p className="mt-2 text-sm text-slate-400">
              Usa tus credenciales para entrar al sistema.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-600">Correo electronico</label>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="admin-input mt-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600">Contrasena</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="admin-input mt-2"
                  required
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="app-button-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Ingresando...' : 'Entrar al sistema'}
              </button>
            </form>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-500 lg:hidden">
              El acceso local puede estar habilitado según la configuración del entorno.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
