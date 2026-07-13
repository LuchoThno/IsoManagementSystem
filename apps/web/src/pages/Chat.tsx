import React from 'react';
import {
  AlertTriangle,
  BellRing,
  Bot,
  MessageSquareMore,
  Plus,
  Search,
  Send,
  Sparkles,
  Users2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import type { Socket } from 'socket.io-client';
import {
  showChatMessageNotification,
  showConnectionStatusNotification,
} from '../lib/browserNotifications';
import {
  listChatThreadsApi,
  markThreadAsReadApi,
  openChatThreadApi,
  openDirectThreadApi,
  sendChatMessageApi,
} from '../lib/chatApi';
import { assistChatThreadWithAI, type ChatAssistResult } from '../lib/aiApi';
import { useAuthConfig } from '../hooks/useAuthConfig';
import { connectChatSocket } from '../lib/chatSocket';
import { useAuthStore } from '../store/useAuthStore';
import { useISOStore } from '../store/useISOStore';
import type { ChatThread, UserAccount } from '../types/iso';

type ConnectionStatus = 'online' | 'disconnected' | 'unavailable';

const getOtherParticipant = (
  thread: ChatThread,
  users: UserAccount[],
  currentUserId: string
) => {
  const otherParticipantId = (thread.participantIds ?? []).find((id) => id !== currentUserId);
  return users.find((user) => user.id === otherParticipantId);
};

const getParticipantUsers = (thread: ChatThread, users: UserAccount[]) =>
  (thread.participantIds ?? [])
    .map((participantId) => users.find((user) => user.id === participantId))
    .filter(Boolean) as UserAccount[];

const getThreadDisplayName = (
  thread: ChatThread,
  users: UserAccount[],
  currentUserId: string
) => {
  if (thread.threadType === 'group') {
    if (thread.title?.trim()) {
      return thread.title;
    }

    const names = getParticipantUsers(thread, users)
      .filter((user) => user.id !== currentUserId)
      .map((user) => user.name);

    return names.length > 0 ? names.slice(0, 3).join(', ') : 'Grupo interno';
  }

  return getOtherParticipant(thread, users, currentUserId)?.name ?? 'Conversación directa';
};

const getThreadMeta = (thread: ChatThread, users: UserAccount[], currentUserId: string) => {
  const participants = getParticipantUsers(thread, users);

  if (thread.threadType === 'group') {
    const otherNames = participants
      .filter((user) => user.id !== currentUserId)
      .map((user) => user.name);

    return `${thread.participantIds.length} participante(s) · ${otherNames.join(', ') || 'Sin detalle'}`;
  }

  const otherUser = getOtherParticipant(thread, users, currentUserId);
  return otherUser ? `${otherUser.email} · ${otherUser.role}` : 'Conversación operativa';
};

export const Chat: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const { authConfig } = useAuthConfig();
  const users = useISOStore((state) => state.users);
  const chatThreads = useISOStore((state) => state.chatThreads);
  const replaceChatThreads = useISOStore((state) => state.replaceChatThreads);
  const upsertChatThread = useISOStore((state) => state.upsertChatThread);
  const notifications = useISOStore((state) => state.notifications);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  const [directoryQuery, setDirectoryQuery] = React.useState('');
  const [groupName, setGroupName] = React.useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = React.useState<string[]>([]);
  const [loadingThreads, setLoadingThreads] = React.useState(true);
  const [creatingGroup, setCreatingGroup] = React.useState(false);
  const [aiGoal, setAiGoal] = React.useState('');
  const [aiBusy, setAiBusy] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<ChatAssistResult | null>(null);
  const [chatError, setChatError] = React.useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>('disconnected');
  const [browserOnline, setBrowserOnline] = React.useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const threadsRef = React.useRef(chatThreads);
  const selectedThreadIdRef = React.useRef<string | null>(selectedThreadId);
  const statusInitializedRef = React.useRef(false);

  React.useEffect(() => {
    threadsRef.current = chatThreads;
  }, [chatThreads]);

  React.useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);

  const updateConnectionStatus = React.useCallback(
    (nextStatus: ConnectionStatus) => {
      setConnectionStatus((current) => {
        if (current === nextStatus) {
          return current;
        }

        if (
          statusInitializedRef.current &&
          notifications.desktop.enabled &&
          notifications.desktop.connectionAlerts
        ) {
          showConnectionStatusNotification(nextStatus);
        }

        statusInitializedRef.current = true;
        return nextStatus;
      });
    },
    [notifications.desktop.connectionAlerts, notifications.desktop.enabled]
  );

  React.useEffect(() => {
    const handleOnline = () => {
      setBrowserOnline(true);
      if (connectionStatus !== 'online') {
        updateConnectionStatus('disconnected');
      }
    };

    const handleOffline = () => {
      setBrowserOnline(false);
      updateConnectionStatus('disconnected');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [connectionStatus, updateConnectionStatus]);

  const availableUsers = React.useMemo(
    () =>
      users.filter((user) => {
        if (user.id === currentUser?.id || !user.active) {
          return false;
        }

        if (
          authConfig?.capabilities.directoryProvider === 'clerk' &&
          !user.id.startsWith('clerk-')
        ) {
          return false;
        }

        const normalized = directoryQuery.trim().toLowerCase();
        if (!normalized) {
          return true;
        }

        return (
          user.name.toLowerCase().includes(normalized) ||
          user.email.toLowerCase().includes(normalized) ||
          user.role.toLowerCase().includes(normalized)
        );
      }),
    [authConfig?.capabilities.directoryProvider, currentUser?.id, directoryQuery, users]
  );

  const sortedThreads = React.useMemo(
    () => [...chatThreads].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()),
    [chatThreads]
  );

  const selectedThread =
    sortedThreads.find((thread) => thread.id === selectedThreadId) ?? sortedThreads[0] ?? null;

  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    let mounted = true;

    const loadThreads = async () => {
      try {
        setLoadingThreads(true);
        replaceChatThreads([]);
        const threads = await listChatThreadsApi(currentUser.id);
        if (mounted) {
          replaceChatThreads(threads);
          setChatError(null);
          if (browserOnline) {
            updateConnectionStatus('disconnected');
          }
        }
      } catch {
        if (mounted) {
          setChatError('No fue posible cargar las conversaciones desde el backend.');
          updateConnectionStatus('unavailable');
        }
      } finally {
        if (mounted) {
          setLoadingThreads(false);
        }
      }
    };

    void loadThreads();

    return () => {
      mounted = false;
    };
  }, [browserOnline, currentUser, replaceChatThreads, updateConnectionStatus]);

  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    let socket: Socket | null = null;
    let mounted = true;

    void connectChatSocket(currentUser.id)
      .then((nextSocket) => {
        if (!mounted) {
          nextSocket.disconnect();
          return;
        }

        socket = nextSocket;

        nextSocket.on('connect', () => {
          setChatError(null);
          updateConnectionStatus('online');
        });

        nextSocket.on('chat:thread-upserted', (thread: ChatThread) => {
          const hydratedThread = {
            ...thread,
            updatedAt: new Date(thread.updatedAt),
            messages: thread.messages.map((item) => ({
              ...item,
              createdAt: new Date(item.createdAt),
            })),
          };
          const previousThread = threadsRef.current.find((item) => item.id === hydratedThread.id);
          const previousMessageId =
            previousThread?.messages[previousThread.messages.length - 1]?.id ?? null;
          const lastMessage = hydratedThread.messages[hydratedThread.messages.length - 1] ?? null;
          const shouldNotify =
            Boolean(lastMessage) &&
            lastMessage?.authorId !== currentUser.id &&
            lastMessage?.id !== previousMessageId &&
            notifications.desktop.enabled &&
            notifications.desktop.chatMessages &&
            (typeof document === 'undefined' ||
              document.hidden ||
              selectedThreadIdRef.current !== hydratedThread.id);

          upsertChatThread(hydratedThread);
          setChatError(null);

          if (shouldNotify && lastMessage) {
            const author =
              users.find((user) => user.id === lastMessage.authorId)?.name ?? 'Chat interno';
            showChatMessageNotification(author, lastMessage.content);
          }
        });

        nextSocket.on('disconnect', () => {
          updateConnectionStatus(browserOnline ? 'disconnected' : 'unavailable');
        });

        nextSocket.on('connect_error', () => {
          setChatError('No fue posible conectar el chat en tiempo real.');
          updateConnectionStatus('unavailable');
        });
      })
      .catch(() => {
        setChatError('No fue posible conectar el chat en tiempo real.');
        updateConnectionStatus('unavailable');
      });

    return () => {
      mounted = false;
      socket?.disconnect();
    };
  }, [
    browserOnline,
    currentUser,
    notifications.desktop.chatMessages,
    notifications.desktop.enabled,
    updateConnectionStatus,
    upsertChatThread,
    users,
  ]);

  React.useEffect(() => {
    if (!selectedThreadId && sortedThreads[0]) {
      setSelectedThreadId(sortedThreads[0].id);
    }
  }, [selectedThreadId, sortedThreads]);

  React.useEffect(() => {
    setAiResult(null);
    setAiGoal('');
  }, [selectedThread?.id]);

  React.useEffect(() => {
    if (!selectedThread || !currentUser || loadingThreads) {
      return;
    }

    const unread = selectedThread.messages.some((item) => !item.readBy.includes(currentUser.id));
    if (!unread) {
      return;
    }

    void markThreadAsReadApi(selectedThread.id, currentUser.id)
      .then((thread) => {
        upsertChatThread(thread);
      })
      .catch(() => {
        setChatError('No fue posible marcar la conversación como leída.');
      });
  }, [currentUser, loadingThreads, selectedThread, upsertChatThread]);

  const handleOpenChat = async (targetUserId: string) => {
    if (!currentUser) return;
    try {
      const thread = await openDirectThreadApi([currentUser.id, targetUserId]);
      upsertChatThread(thread);
      setSelectedThreadId(thread.id);
      setChatError(null);
    } catch {
      setChatError('No fue posible abrir la conversación.');
    }
  };

  const handleToggleParticipant = (userId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(userId)
        ? current.filter((participantId) => participantId !== userId)
        : [...current, userId]
    );
  };

  const handleCreateGroupChat = async () => {
    if (!currentUser || selectedParticipantIds.length === 0) {
      return;
    }

    try {
      setCreatingGroup(true);
      const thread = await openChatThreadApi({
        participantIds: [currentUser.id, ...selectedParticipantIds],
        title: groupName.trim() || undefined,
      });
      upsertChatThread(thread);
      setSelectedThreadId(thread.id);
      setSelectedParticipantIds([]);
      setGroupName('');
      setChatError(null);
    } catch {
      setChatError('No fue posible crear la conversación grupal.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleSendMessage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentUser || !selectedThread || !message.trim()) {
      return;
    }

    try {
      const thread = await sendChatMessageApi(selectedThread.id, currentUser.id, message.trim());
      upsertChatThread(thread);
      setMessage('');
      setChatError(null);
    } catch {
      setChatError('No fue posible enviar el mensaje.');
    }
  };

  const handleAssistChat = async () => {
    if (!selectedThread) {
      return;
    }

    try {
      setAiBusy(true);
      const result = await assistChatThreadWithAI({
        threadId: selectedThread.id,
        goal: aiGoal.trim() || undefined,
      });
      setAiResult(result);
      setChatError(null);
    } catch {
      setChatError('No fue posible ejecutar la asistencia IA para el chat.');
    } finally {
      setAiBusy(false);
    }
  };

  const connectionMeta = React.useMemo(() => {
    switch (connectionStatus) {
      case 'online':
        return {
          label: 'En línea',
          description: 'Chat en tiempo real operativo y sincronizado.',
          classes: 'bg-emerald-100 text-emerald-700',
          icon: Wifi,
        };
      case 'unavailable':
        return {
          label: 'No disponible',
          description: 'El servicio no respondió o la sesión no alcanzó el backend.',
          classes: 'bg-rose-100 text-rose-700',
          icon: AlertTriangle,
        };
      default:
        return {
          label: 'Desconectado',
          description: browserOnline
            ? 'Reintentando conexión en tiempo real.'
            : 'El dispositivo está sin conectividad de red.',
          classes: 'bg-amber-100 text-amber-700',
          icon: WifiOff,
        };
    }
  }, [browserOnline, connectionStatus]);

  const ConnectionIcon = connectionMeta.icon;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-app-text">Chat interno</h2>
          <p className="mt-1 text-sm text-app-muted">
            Conversaciones directas y grupales para seguimiento operativo, con apoyo IA sobre el hilo activo.
          </p>
        </div>

        <div className="rounded-[24px] border border-app-border bg-app-surface px-4 py-4 shadow-panel">
          <div className="flex items-center gap-3">
            <div className={`rounded-2xl p-3 ${connectionMeta.classes}`}>
              <ConnectionIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-extrabold uppercase tracking-[0.18em] text-slate-500">
                  Estado de conexión
                </p>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${connectionMeta.classes}`}>
                  {connectionMeta.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-app-muted">{connectionMeta.description}</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-app-surface-alt px-3 py-1.5 text-xs font-semibold text-slate-500">
            <BellRing className="h-3.5 w-3.5" />
            {notifications.desktop.enabled && notifications.desktop.chatMessages
              ? 'Burbujas del dispositivo activas para nuevos mensajes'
              : 'Burbujas del dispositivo desactivadas'}
          </div>
        </div>
      </div>

      {chatError ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {chatError}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="overflow-hidden rounded-[28px] border border-app-border bg-app-surface shadow-panel">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="app-icon-chip">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="panel-title">Directorio</h3>
                <p className="mt-1 text-sm text-app-muted">
                  {availableUsers.length} usuario(s) activo(s)
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-app-border bg-app-surface-alt px-4 py-3">
              <Search className="h-4 w-4 text-app-muted" />
              <input
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                placeholder="Buscar usuario..."
                className="w-full border-none bg-transparent text-sm text-app-text outline-none placeholder:text-app-muted"
              />
            </div>
          </div>

          <div className="max-h-[250px] space-y-2 overflow-y-auto px-5 py-4">
            {loadingThreads ? (
              <div className="rounded-xl border border-dashed border-app-border bg-app-surface-alt px-4 py-6 text-center text-sm text-app-muted">
                Cargando conversaciones...
              </div>
            ) : null}
            {availableUsers.map((user) => {
              const selected = selectedParticipantIds.includes(user.id);
              return (
                <div
                  key={user.id}
                  className="rounded-xl border border-app-border px-4 py-3 transition hover:border-slate-300 hover:bg-app-surface-alt"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-app-text">{user.name}</p>
                      <p className="mt-1 text-xs text-app-muted">{user.email}</p>
                    </div>
                    <span className="rounded-full bg-app-primary/10 px-2.5 py-1 text-xs font-bold uppercase text-app-primary">
                      {user.role}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => handleToggleParticipant(user.id)}
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Seleccionar para grupo
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleOpenChat(user.id)}
                      className="rounded-full border border-app-border px-3 py-1.5 text-xs font-bold text-app-text transition hover:bg-white"
                    >
                      Chat directo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t border-slate-100 bg-app-surface-alt px-5 py-5">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-app-primary" />
              <h4 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
                Nuevo grupo
              </h4>
            </div>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Nombre del grupo opcional"
              className="admin-input mt-3"
            />
            <p className="mt-2 text-xs text-slate-500">
              {selectedParticipantIds.length} participante(s) seleccionado(s) además de tu usuario.
            </p>
            <button
              type="button"
              disabled={creatingGroup || selectedParticipantIds.length === 0}
              onClick={() => void handleCreateGroupChat()}
              className="app-button-primary mt-3 w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creatingGroup ? 'Creando grupo...' : 'Crear conversación grupal'}
            </button>
          </div>

          <div className="border-t border-slate-100 px-5 py-5">
            <h4 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Conversaciones recientes
            </h4>
            <div className="mt-3 space-y-2">
              {sortedThreads.map((thread) => {
                if (!currentUser) return null;
                const unreadCount = thread.messages.filter(
                  (item) => !item.readBy.includes(currentUser.id)
                ).length;

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setSelectedThreadId(thread.id)}
                    className={`block w-full rounded-xl border px-4 py-3 text-left transition ${
                      selectedThread?.id === thread.id
                        ? 'border-app-primary bg-app-primary/5'
                        : 'border-app-border hover:bg-app-surface-alt'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-app-text">
                            {getThreadDisplayName(thread, users, currentUser.id)}
                          </p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase text-slate-600">
                            {thread.threadType === 'group' ? 'Grupo' : 'Directo'}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-app-muted">
                          {thread.messages[thread.messages.length - 1]?.content ?? 'Sin mensajes aún'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-app-danger px-2 py-1 text-xs font-bold text-white">
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="panel-card flex min-h-[680px] flex-col overflow-hidden">
          {selectedThread && currentUser ? (
            <>
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                      Conversación activa
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <h3 className="text-xl font-extrabold text-app-text">
                        {getThreadDisplayName(selectedThread, users, currentUser.id)}
                      </h3>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                        {selectedThread.threadType === 'group' ? 'Grupo' : 'Directo'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-app-muted">
                      {getThreadMeta(selectedThread, users, currentUser.id)}
                    </p>
                    <p className="mt-1 text-sm text-app-muted">
                      {selectedThread.messages.length} mensaje(s) en este hilo
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${connectionMeta.classes}`}>
                    {connectionMeta.label}
                  </span>
                </div>
              </div>

              <div className="border-b border-slate-100 bg-white px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-app-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-app-primary">
                      <Bot className="h-3.5 w-3.5" />
                      IA del chat
                    </div>
                    <p className="mt-3 text-sm text-slate-500">
                      Resume el hilo activo, detecta próximos pasos y sugiere respuestas listas para enviar.
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-app-primary" />
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
                  <input
                    value={aiGoal}
                    onChange={(event) => setAiGoal(event.target.value)}
                    placeholder="Objetivo opcional: cierre, seguimiento, coordinación, etc."
                    className="admin-input"
                  />
                  <button
                    type="button"
                    disabled={aiBusy}
                    onClick={() => void handleAssistChat()}
                    className="app-button-secondary px-5 py-3 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {aiBusy ? 'Analizando hilo...' : 'Asistir conversación'}
                  </button>
                </div>

                {aiResult ? (
                  <div className="mt-4 rounded-3xl border border-slate-200 bg-app-surface-alt p-5">
                    <p className="text-sm font-extrabold text-app-text">Resumen IA</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{aiResult.summary}</p>

                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Respuestas sugeridas
                        </p>
                        <div className="mt-2 space-y-2">
                          {aiResult.suggestedReplies.map((reply, index) => (
                            <button
                              key={`${aiResult.id}-reply-${index + 1}`}
                              type="button"
                              onClick={() => setMessage(reply)}
                              className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition hover:border-app-primary hover:bg-app-primary/5"
                            >
                              {reply}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                          Próximas acciones
                        </p>
                        <div className="mt-2 space-y-2">
                          {aiResult.actionItems.map((action, index) => (
                            <div
                              key={`${aiResult.id}-action-${index + 1}`}
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600"
                            >
                              {index + 1}. {action}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)] px-6 py-6">
                {selectedThread.messages.map((item) => {
                  const ownMessage = item.authorId === currentUser.id;
                  const author = users.find((user) => user.id === item.authorId);

                  return (
                    <div
                      key={item.id}
                      className={`flex ${ownMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-3 shadow-sm ${
                          ownMessage
                            ? 'bg-app-primary text-white'
                            : 'border border-app-border bg-app-surface text-slate-700'
                        }`}
                      >
                        <p className="text-xs font-bold uppercase tracking-wide opacity-70">
                          {author?.name ?? 'Usuario'}
                        </p>
                        <p className="mt-2 text-sm leading-6">{item.content}</p>
                        <p className="mt-2 text-[11px] opacity-70">
                          {item.createdAt.toLocaleString('es-CL')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="border-t border-slate-100 px-6 py-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Escribe un mensaje operativo..."
                    className="admin-input min-h-[90px] resize-none"
                  />
                  <button
                    type="submit"
                    className="app-button-primary inline-flex items-center gap-2 px-5 py-3"
                  >
                    <Send className="h-4 w-4" />
                    Enviar
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="rounded-full bg-app-primary/10 p-4 text-app-primary">
                <MessageSquareMore className="h-8 w-8" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-app-text">Selecciona una conversación</p>
                <p className="mt-2 text-sm text-app-muted">
                  Elige un usuario activo o crea un grupo para iniciar un chat interno con apoyo IA.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
