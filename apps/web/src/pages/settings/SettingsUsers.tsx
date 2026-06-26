import React from 'react';
import { Plus, Shield, Trash2, UserCog } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { createUser, deleteUser, fetchBootstrap, getCurrentUser, updateUser } from '../../lib/api';
import { useISOStore } from '../../store/useISOStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { UserAccount, UserRole } from '../../types/iso';

export const SettingsUsers: React.FC = () => {
  const [searchParams] = useSearchParams();
  const users = useISOStore((state) => state.users);
  const hydrate = useISOStore((state) => state.hydrate);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const [message, setMessage] = React.useState('');
  const [userQuery, setUserQuery] = React.useState(searchParams.get('q') ?? '');
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [userForm, setUserForm] = React.useState({
    name: '',
    email: '',
    role: 'viewer' as UserRole,
    password: '',
    active: true,
  });

  React.useEffect(() => {
    setUserQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const filteredUsers = React.useMemo(
    () =>
      users.filter((user) => {
        const normalized = userQuery.trim().toLowerCase();
        if (!normalized) return true;
        return (
          user.name.toLowerCase().includes(normalized) ||
          user.email.toLowerCase().includes(normalized) ||
          user.role.toLowerCase().includes(normalized)
        );
      }),
    [userQuery, users]
  );

  const showMessage = (value: string) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 2500);
  };

  const resetUserForm = () => {
    setUserForm({
      name: '',
      email: '',
      role: 'viewer',
      password: '',
      active: true,
    });
    setEditingUserId(null);
  };

  const syncUsers = async (successMessage: string) => {
    hydrate(await fetchBootstrap());
    setAuthUser(await getCurrentUser());
    resetUserForm();
    showMessage(successMessage);
  };

  const handleSubmitUser = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (!editingUserId && userForm.password.trim().length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      if (editingUserId) {
        await updateUser(editingUserId, userForm);
        await syncUsers('Usuario actualizado correctamente.');
        return;
      }

      await createUser(userForm);
      await syncUsers('Usuario creado correctamente.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'No fue posible guardar el usuario.');
    }
  };

  const handleEditUser = (user: UserAccount) => {
    setEditingUserId(user.id);
    setUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
      active: user.active,
    });
  };

  const handleDeleteUser = async (user: UserAccount) => {
    const currentUser = await getCurrentUser();
    if (currentUser?.id === user.id) {
      showMessage('No puedes eliminar el usuario con sesión activa.');
      return;
    }
    if (!window.confirm(`Eliminar al usuario "${user.name}"?`)) return;
    try {
      await deleteUser(user.id);
      await syncUsers('Usuario eliminado correctamente.');
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'No fue posible eliminar el usuario.');
    }
  };

  const handleToggleUser = async (user: UserAccount) => {
    try {
      await updateUser(user.id, { active: !user.active });
      await syncUsers(`Usuario ${user.active ? 'desactivado' : 'activado'} correctamente.`);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'No fue posible actualizar el usuario.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-700">Usuarios</h2>
          <p className="mt-1 text-sm text-slate-400">
            Gestiona cuentas, roles y estado de acceso del sistema.
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="panel-title">Gestor de usuarios</h3>
          <form onSubmit={handleSubmitUser} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-600">Nombre completo</label>
              <input
                value={userForm.name}
                onChange={(event) => setUserForm({ ...userForm, name: event.target.value })}
                className="admin-input mt-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-600">Correo electrónico</label>
              <input
                type="email"
                value={userForm.email}
                onChange={(event) => setUserForm({ ...userForm, email: event.target.value })}
                className="admin-input mt-2"
                required
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-bold text-slate-600">Rol</label>
                <select
                  value={userForm.role}
                  onChange={(event) =>
                    setUserForm({ ...userForm, role: event.target.value as UserRole })
                  }
                  className="admin-select mt-2 w-full"
                >
                  <option value="admin">Administrador</option>
                  <option value="manager">Gestor</option>
                  <option value="auditor">Auditor</option>
                  <option value="viewer">Consulta</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600">Contraseña</label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                  className="admin-input mt-2"
                  placeholder={editingUserId ? 'Dejar vacía para mantener la actual' : 'Mínimo 6 caracteres'}
                />
              </div>
            </div>
            <label className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
              <span className="font-semibold text-slate-700">Usuario activo</span>
              <input
                type="checkbox"
                checked={userForm.active}
                onChange={(event) => setUserForm({ ...userForm, active: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-blue-600"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#727cf5] px-5 py-3 font-bold text-white transition hover:bg-[#636df0]"
              >
                <Plus className="h-4 w-4" />
                {editingUserId ? 'Actualizar usuario' : 'Crear usuario'}
              </button>
              {editingUserId && (
                <button
                  type="button"
                  onClick={resetUserForm}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar edición
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="panel-title">Usuarios registrados</h3>
              <p className="mt-2 text-sm text-slate-400">
                Busca, activa, edita o elimina cuentas disponibles en el entorno actual.
              </p>
            </div>
            <input
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Buscar usuario..."
              className="admin-input max-w-[220px]"
            />
          </div>

          <div className="mt-6 space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-700">{user.name}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#39afd1]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#39afd1]">
                      <Shield className="h-3.5 w-3.5" />
                      {user.role}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleToggleUser(user)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      {user.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEditUser(user)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteUser(user)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
    </div>
  );
};
