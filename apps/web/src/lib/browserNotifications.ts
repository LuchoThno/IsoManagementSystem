type ConnectionState = 'online' | 'disconnected' | 'unavailable';

const APP_ICON = '/favicon.ico';

const getNotificationApi = () =>
  typeof window !== 'undefined' && 'Notification' in window ? window.Notification : null;

export const isBrowserNotificationsSupported = () => Boolean(getNotificationApi());

export const getBrowserNotificationPermission = (): NotificationPermission | 'unsupported' => {
  const NotificationApi = getNotificationApi();
  return NotificationApi ? NotificationApi.permission : 'unsupported';
};

export const requestBrowserNotificationPermission = async (): Promise<
  NotificationPermission | 'unsupported'
> => {
  const NotificationApi = getNotificationApi();
  if (!NotificationApi) {
    return 'unsupported';
  }

  return NotificationApi.requestPermission();
};

const showNotification = (title: string, options: NotificationOptions) => {
  const NotificationApi = getNotificationApi();
  if (!NotificationApi || NotificationApi.permission !== 'granted') {
    return;
  }

  const notification = new NotificationApi(title, {
    icon: APP_ICON,
    badge: APP_ICON,
    ...options,
  });

  window.setTimeout(() => notification.close(), 7000);
};

export const showChatMessageNotification = (authorName: string, content: string) => {
  showNotification(`Nuevo mensaje de ${authorName}`, {
    body: content,
    tag: `chat-message-${authorName}`,
    renotify: true,
  });
};

export const showConnectionStatusNotification = (status: ConnectionState) => {
  const copy: Record<ConnectionState, { title: string; body: string }> = {
    online: {
      title: 'Chat interno conectado',
      body: 'La conexión en tiempo real volvió a estar disponible.',
    },
    disconnected: {
      title: 'Chat interno desconectado',
      body: 'La conexión en tiempo real se perdió. Seguiremos intentando reconectar.',
    },
    unavailable: {
      title: 'Chat interno no disponible',
      body: 'No fue posible alcanzar el servicio de chat en este momento.',
    },
  };

  showNotification(copy[status].title, {
    body: copy[status].body,
    tag: `chat-status-${status}`,
    renotify: true,
  });
};
