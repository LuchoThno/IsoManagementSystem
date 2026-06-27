import React from 'react';
import { SignIn, useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { BrandLockup } from '../components/brand/Brand';
import { clerkAfterSignInUrl, clerkSignInPath, clerkSignUpPath, isClerkEnabled } from '../lib/clerk';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const initialize = useAuthStore((state) => state.initialize);

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  const { isSignedIn } = useUser();

  React.useEffect(() => {
    if (!initialized && !isClerkEnabled) {
      void initialize();
    }
  }, [initialize, initialized]);

  if (isClerkEnabled && isSignedIn) {
    return <Navigate to={clerkAfterSignInUrl} replace />;
  }

  if (!isClerkEnabled && initialized && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  if (isClerkEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] px-4">
        <div className="grid w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
          <div className="hidden bg-[#313a46] p-10 text-white lg:block">
            <BrandLockup inverse />
            <h1 className="mt-4 text-4xl font-extrabold">Acceso corporativo Servasmar</h1>
            <p className="mt-4 max-w-md text-white/75">
              Inicia sesión con Clerk usando la misma base de identidad del CRM de Servasmar para entrar al panel ISO.
            </p>
            <div className="mt-10 rounded-2xl bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#0acf97]" />
                <p className="font-bold">Inicio de sesión centralizado</p>
              </div>
              <p className="mt-3 text-sm text-white/80">
                Si tu cuenta ya existe en el ecosistema Servasmar, Clerk la reutilizará aquí y sincronizará tu perfil al entorno ISO.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 md:p-10">
            <SignIn
              path={clerkSignInPath}
              routing="path"
              signUpUrl={clerkSignUpPath}
              fallbackRedirectUrl={clerkAfterSignInUrl}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-[#313a46] p-10 text-white lg:block">
          <BrandLockup inverse />
          <h1 className="mt-4 text-4xl font-extrabold">Acceso al panel ISO</h1>
          <p className="mt-4 max-w-md text-white/75">
            Inicia sesión para administrar documentos, tareas, auditorías, usuarios y configuración del sistema.
          </p>
          <div className="mt-10 rounded-2xl bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#0acf97]" />
              <p className="font-bold">Acceso local</p>
            </div>
            <p className="mt-3 text-sm text-white/80">
              Usa las credenciales configuradas para este entorno cuando el acceso local esté habilitado.
            </p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mx-auto max-w-md">
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
                className="w-full rounded-lg bg-[#727cf5] px-4 py-3 font-bold text-white transition hover:bg-[#636df0] disabled:cursor-not-allowed disabled:opacity-60"
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
