import React from 'react';
import { Plus, Shield, Trash2, UserCog } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useUIPermissions } from '../../hooks/useUIPermissions';
import {
  createUser,
  deleteUser,
  getCurrentUser,
  listUsers,
  updateUser,
} from '../../lib/api';
import { isClerkEnabled } from '../../lib/clerk';
import { useISOStore } from '../../store/useISOStore';
import { useAuthStore } from '../../store/useAuthStore';
import type { UserAccount, UserRole } from '../../types/iso';

export const SettingsUsers: React.FC = () => {
  const [searchParams] = useSearchParams();
  const users = useISOStore((state) => state.users);
  const replaceUsers = useISOStore((state) => state.replaceUsers);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const {
    authConfig,
    loading,
    canAccessUsersPanel,
    canManageUsers,
  } = useUIPermissions();
  const [message, setMessage] = React.useState('');
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [authMode, setAuthMode] = React.useState<'clerk' | 'demo' | 'disabled'>(
    isClerkEnabled ? 'clerk' : 'demo'
  );
  const [manualUserManagement, setManualUserManagement] = React.useState(!isClerkEnabled);
  const [userQuery, setUserQuery] = React.useState(searchParams.get('q') ?? '');
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [userForm, setUserForm] = React.useState({
    name: '',
    email: '',
    role: 'viewer' as UserRole,
    password: '',
    active: true,
  });
  const usesClerkDirectory = authMode === 'clerk';
  const canPersistUsersFromPanel = manualUserManagement || usesClerkDirectory;
  const isAccessContextResolved = !loading;
  const canViewUsers = canAccessUsersPanel;

  React.useEffect(() => {
    setUserQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  React.useEffect(() => {
    if (!authConfig) {
      return;
    }

    setAuthMode(authConfig.mode);
    setManualUserManagement(authConfig.capabilities.manualUserManagement);
  }, [authConfig]);

  React.useEffect(() => {
    if (!isAccessContextResolved || !canViewUsers) {
      return;
    }

    let mounted = true;

    const loadUsers = async () => {
      setLoadingUsers(true);
      try {
        const [directoryUsers, currentUser] = await Promise.all([
          listUsers(),
          getCurrentUser(),
        ]);

        if (!mounted) {
          return;
        }

        replaceUsers(directoryUsers);
        setAuthUser(currentUser);
      } catch (error) {
        if (mounted) {
          showMessage(
            error instanceof Error
              ? error.message
              : 'No fue posible cargar el directorio de usuarios.'
          );
        }
      } finally {
        if (mounted) {
          setLoadingUsers(false);
        }
      }
    };

    void loadUsers();

    return () => {
      mounted = false;
    };
  }, [canViewUsers, isAccessContextResolved, replaceUsers, setAuthUser]);

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
    replaceUsers(await listUsers());
    setAuthUser(await getCurrentUser());
    resetUserForm();
    showMessage(successMessage);
  };

  const handleSubmitUser = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!canPersistUsersFromPanel) {
      showMessage('La administración de usuarios no está disponible en este entorno.');
      return;
    }

    try {
      if (!editingUserId && userForm.password.trim().length < 6) {
        showMessage('La contraseña debe tener al menos 6 caracteres.');
        return;
      }

      if (editingUserId) {
        const updates: Partial<UserAccount> & { password?: string } = {
          name: userForm.name,
          email: userForm.email,
          role: userForm.role,
          active: userForm.active,
        };

        if (userForm.password.trim()) {
          updates.password = userForm.password.trim();
        }

        await updateUser(editingUserId, updates);
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
    if (!canPersistUsersFromPanel) {
      showMessage('La edición de usuarios no está disponible en este entorno.');
      return;
    }

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
    if (!canPersistUsersFromPanel) {
      showMessage('La eliminación de usuarios no está disponible en este entorno.');
      return;
    }

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
    if (!canPersistUsersFromPanel) {
      showMessage('La activación y desactivación de usuarios no está disponible en este entorno.');
      return;
    }

    try {
      const currentUser = await getCurrentUser();
      if (currentUser?.id === user.id && user.active) {
        showMessage('No puedes desactivar el usuario con sesión activa.');
        return;
      }
      await updateUser(user.id, { active: !user.active });
      await syncUsers(`Usuario ${user.active ? 'desactivado' : 'activado'} correctamente.`);
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'No fue posible actualizar el usuario.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="app-icon-chip">
          <UserCog className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-app-text">Usuarios</h2>
          <p className="mt-1 text-sm text-app-muted">
            {authMode === 'disabled'
              ? 'La autenticación está deshabilitada en este entorno y no hay administración disponible.'
              : usesClerkDirectory
              ? 'Administra altas, roles y estado de acceso desde la app, con identidad y MFA delegados en Clerk.'
              : 'Gestiona cuentas, roles y estado de acceso del sistema.'}
          </p>
        </div>
      </div>

      {isAccessContextResolved && !canViewUsers && authConfig?.mode !== 'disabled' && (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Tu sesión actual no tiene permisos para consultar el directorio de usuarios en este entorno.
        </div>
      )}

      {usesClerkDirectory && (
        <div className="rounded-[24px] border border-sky-200 bg-sky-50 px-5 py-4 text-sm text-sky-900">
          {authMode === 'disabled'
            ? 'Este entorno tiene la autenticación deshabilitada por configuración. La administración de usuarios no está disponible desde este panel.'
            : 'Este entorno usa `Clerk` como directorio principal. Aquí puedes crear usuarios, asignar roles y activar o desactivar acceso operativo; MFA y políticas avanzadas de credenciales siguen administrándose en Clerk.'}
        </div>
      )}

      {isAccessContextResolved && !canViewUsers ? (
        <section className="rounded-[28px] border border-app-border bg-app-surface p-6 shadow-panel">
          <h3 className="panel-title">Acceso restringido</h3>
          <p className="mt-3 text-sm text-app-muted">
            El backend resolvió esta sesión sin permisos para visualizar o administrar usuarios.
            Si necesitas operar este módulo, solicita un rol con acceso al directorio o usa el
            proveedor de identidad correspondiente.
          </p>
        </section>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[28px] border border-app-border bg-app-surface p-6 shadow-panel">
          <h3 className="panel-title">
            {usesClerkDirectory ? 'Directorio sincronizado' : 'Gestor de usuarios'}
          </h3>
          {!canManageUsers || !canPersistUsersFromPanel ? (
            <div className="mt-6 space-y-4 rounded-[24px] border border-dashed border-app-border bg-app-muted/30 p-5">
              <div>
                <p className="text-sm font-bold text-app-text">Alcance en este entorno</p>
                <p className="mt-2 text-sm text-app-muted">
                  {canManageUsers
                    ? 'La autenticación del entorno no expone persistencia de usuarios desde este panel.'
                    : 'Tu sesión puede consultar usuarios, pero no administrarlos desde este panel.'}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold text-app-text">Gestión recomendada</p>
                <p className="mt-2 text-sm text-app-muted">
                  {authMode === 'disabled'
                    ? 'Rehabilita primero el modo de autenticación del backend antes de intentar operar usuarios desde este entorno.'
                    : canManageUsers
                    ? 'Usa este panel para altas, roles y activación de usuarios. Si necesitas MFA, políticas de contraseña o sesiones, complétalo desde Clerk.'
                    : 'Solicita un rol con permisos de administración si necesitas crear, editar o desactivar usuarios desde este entorno.'}
                </p>
              </div>
            </div>
          ) : (
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
                  disabled={usesClerkDirectory && Boolean(editingUserId)}
                  required
                />
                {usesClerkDirectory && editingUserId ? (
                  <p className="mt-2 text-xs text-app-muted">
                    El correo de cuentas existentes se mantiene gobernado por Clerk.
                  </p>
                ) : null}
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
                    placeholder={
                      editingUserId ? 'Dejar vacía para mantener la actual' : 'Mínimo 6 caracteres'
                    }
                  />
                </div>
              </div>
              <label className="flex items-center justify-between rounded-2xl border border-app-border px-4 py-4">
                <span className="font-semibold text-slate-700">Usuario activo</span>
                <input
                  type="checkbox"
                  checked={userForm.active}
                  onChange={(event) => setUserForm({ ...userForm, active: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600"
                />
              </label>
              <div className="flex flex-wrap gap-3">
                {editingUserId ? (
                  <button
                    type="button"
                    onClick={resetUserForm}
                    className="app-button-secondary px-5 py-3"
                  >
                    Cancelar edición
                  </button>
                ) : null}
                {editingUserId ? null : (
                  <button
                    type="submit"
                    className="app-button-primary inline-flex items-center gap-2 px-5 py-3"
                  >
                    <Plus className="h-4 w-4" />
                    Crear usuario
                  </button>
                )}
                {editingUserId ? (
                  <button
                    type="submit"
                    className="app-button-primary inline-flex items-center gap-2 px-5 py-3"
                  >
                    <Plus className="h-4 w-4" />
                    Actualizar usuario
                  </button>
                ) : null}
              </div>
            </form>
          )}
        </section>

        <section className="rounded-[28px] border border-app-border bg-app-surface p-6 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="panel-title">Usuarios registrados</h3>
              <p className="mt-2 text-sm text-slate-400">
                {authMode === 'disabled'
                  ? 'Revisa el último estado sincronizado disponible para este entorno.'
                  : usesClerkDirectory
                  ? 'Busca, revisa y administra cuentas sincronizadas con Clerk para el entorno actual.'
                  : 'Busca, activa, edita o elimina cuentas disponibles en el entorno actual.'}
              </p>
            </div>
            <input
              value={userQuery}
              onChange={(event) => setUserQuery(event.target.value)}
              placeholder="Buscar usuario..."
              className="admin-input max-w-[220px]"
            />
          </div>

          {loadingUsers ? (
            <div className="mt-6 rounded-[24px] border border-dashed border-app-border bg-app-muted/20 px-5 py-6 text-sm text-app-muted">
              Cargando usuarios...
            </div>
          ) : null}

          <div className="mt-6 space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-app-text">{user.name}</p>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          user.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {user.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{user.email}</p>
                    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-app-info/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-app-info">
                      <Shield className="h-3.5 w-3.5" />
                      {user.role}
                    </div>
                  </div>
                  {canManageUsers && canPersistUsersFromPanel && (
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
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {message}
        </div>
      )}
    </div>
  );
};
