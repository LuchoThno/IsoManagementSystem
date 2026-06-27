import React from 'react';
import {
  AlertTriangle,
  BellRing,
  MessageSquareMore,
  Search,
  Send,
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
  openDirectThreadApi,
  sendChatMessageApi,
} from '../lib/chatApi';
import { isClerkEnabled } from '../lib/clerk';
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

export const Chat: React.FC = () => {
  const currentUser = useAuthStore((state) => state.user);
  const users = useISOStore((state) => state.users);
  const chatThreads = useISOStore((state) => state.chatThreads);
  const replaceChatThreads = useISOStore((state) => state.replaceChatThreads);
  const upsertChatThread = useISOStore((state) => state.upsertChatThread);
  const notifications = useISOStore((state) => state.notifications);
  const [selectedThreadId, setSelectedThreadId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  const [directoryQuery, setDirectoryQuery] = React.useState('');
  const [loadingThreads, setLoadingThreads] = React.useState(true);
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

        if (statusInitializedRef.current && notifications.desktop.enabled && notifications.desktop.connectionAlerts) {
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

        if (isClerkEnabled && !user.id.startsWith('clerk-')) {
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
    [currentUser?.id, directoryQuery, users]
  );

  const sortedThreads = React.useMemo(
    () =>
      [...chatThreads].sort(
        (left, right) => right.updatedAt.getTime() - left.updatedAt.getTime()
      ),
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
          const lastMessage =
            hydratedThread.messages[hydratedThread.messages.length - 1] ?? null;
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
          <h2 className="text-2xl font-extrabold text-slate-700">Chat interno</h2>
          <p className="mt-1 text-sm text-slate-400">
            Conversaciones operativas para seguimiento de tareas, auditorías y coordinación interna.
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-sm">
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
              <p className="mt-1 text-sm text-slate-400">{connectionMeta.description}</p>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
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

      <div className="grid gap-6 xl:grid-cols-[330px_1fr]">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#727cf5]/10 p-3 text-[#727cf5]">
                <Users2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="panel-title">Directorio</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {availableUsers.length} usuario(s) activo(s)
                </p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                value={directoryQuery}
                onChange={(event) => setDirectoryQuery(event.target.value)}
                placeholder="Buscar usuario..."
                className="w-full border-none bg-transparent text-sm text-slate-600 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="max-h-[270px] space-y-2 overflow-y-auto px-5 py-4">
            {loadingThreads ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                Cargando conversaciones...
              </div>
            ) : null}
            {availableUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => void handleOpenChat(user.id)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div>
                  <p className="font-bold text-slate-700">{user.name}</p>
                  <p className="mt-1 text-xs text-slate-400">{user.email}</p>
                </div>
                <span className="rounded-full bg-[#727cf5]/10 px-2.5 py-1 text-xs font-bold uppercase text-[#727cf5]">
                  {user.role}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 px-5 py-5">
            <h4 className="text-sm font-extrabold uppercase tracking-[0.2em] text-slate-400">
              Conversaciones recientes
            </h4>
            <div className="mt-3 space-y-2">
              {sortedThreads.map((thread) => {
                if (!currentUser) return null;
                const otherUser = getOtherParticipant(thread, users, currentUser.id);
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
                        ? 'border-[#727cf5] bg-[#727cf5]/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold text-slate-700">
                          {otherUser?.name ?? 'Conversacion'}
                        </p>
                        <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                          {thread.messages[thread.messages.length - 1]?.content ?? 'Sin mensajes aun'}
                        </p>
                      </div>
                      {unreadCount > 0 && (
                        <span className="rounded-full bg-[#fa5c7c] px-2 py-1 text-xs font-bold text-white">
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

        <section className="panel-card flex min-h-[620px] flex-col overflow-hidden">
          {selectedThread && currentUser ? (
            <>
              <div className="border-b border-slate-100 px-6 py-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                      Conversación activa
                    </p>
                    <h3 className="mt-2 text-xl font-extrabold text-slate-700">
                      {getOtherParticipant(selectedThread, users, currentUser.id)?.name ?? 'Equipo'}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400">
                      {selectedThread.messages.length} mensaje(s) en este hilo
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${connectionMeta.classes}`}>
                    {connectionMeta.label}
                  </span>
                </div>
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
                            ? 'bg-[#727cf5] text-white'
                            : 'border border-slate-200 bg-white text-slate-700'
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
                    className="inline-flex items-center gap-2 rounded-xl bg-[#727cf5] px-5 py-3 font-bold text-white transition hover:bg-[#636df0]"
                  >
                    <Send className="h-4 w-4" />
                    Enviar
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <div className="rounded-full bg-[#727cf5]/10 p-4 text-[#727cf5]">
                <MessageSquareMore className="h-8 w-8" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-slate-700">Selecciona una conversacion</p>
                <p className="mt-2 text-sm text-slate-400">
                  Elige un usuario activo para iniciar un chat interno.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
