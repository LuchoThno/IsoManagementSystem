import React from 'react';
import { Navigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

export const Login: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const error = useAuthStore((state) => state.error);
  const login = useAuthStore((state) => state.login);
  const initialize = useAuthStore((state) => state.initialize);

  const [email, setEmail] = React.useState('admin@iso.local');
  const [password, setPassword] = React.useState('Admin123!');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!initialized) {
      void initialize();
    }
  }, [initialize, initialized]);

  if (initialized && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    await login(email, password);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#eef2f7] px-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[1.1fr_0.9fr]">
        <div className="hidden bg-[#313a46] p-10 text-white lg:block">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/45">ISO Manager</p>
          <h1 className="mt-4 text-4xl font-extrabold">Acceso al panel de pruebas</h1>
          <p className="mt-4 max-w-md text-white/75">
            Inicia sesion para administrar documentos, tareas, auditorias, usuarios y configuracion desde esta demo local.
          </p>
          <div className="mt-10 rounded-2xl bg-white/5 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-[#0acf97]" />
              <p className="font-bold">Credenciales demo</p>
            </div>
            <p className="mt-3 text-sm text-white/80">Correo: `admin@iso.local`</p>
            <p className="mt-1 text-sm text-white/80">Clave: `Admin123!`</p>
          </div>
        </div>

        <div className="p-8 md:p-10">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
              Bienvenido
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-700">Iniciar sesion</h2>
            <p className="mt-2 text-sm text-slate-400">
              Usa tu usuario local para entrar al sistema.
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
              Credenciales demo: `admin@iso.local` / `Admin123!`
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
