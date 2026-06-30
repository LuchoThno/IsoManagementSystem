import { io, type Socket } from 'socket.io-client';
import { getClerkSessionToken } from './clerkSession';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const PRODUCTION_FRONTEND_HOSTS = new Set(['iso.servasmar.cl', 'www.iso.servasmar.cl']);
const isIsoProductionHost = () =>
  typeof window !== 'undefined' && PRODUCTION_FRONTEND_HOSTS.has(window.location.hostname);

const getSocketBaseUrl = () => {
  if (isIsoProductionHost()) {
    return window.location.origin;
  }

  const configured = import.meta.env.VITE_SOCKET_URL;
  if (typeof configured === 'string' && configured.trim()) {
    return configured;
  }

  return API_BASE.replace(/\/api\/?$/, '');
};

export const connectChatSocket = async (userId: string): Promise<Socket> => {
  const token = await getClerkSessionToken();
  const usePollingOnly = isIsoProductionHost();

  return io(getSocketBaseUrl(), {
    transports: usePollingOnly ? ['polling'] : ['websocket', 'polling'],
    upgrade: !usePollingOnly,
    query: {
      userId,
    },
    auth: token
      ? {
          token,
        }
      : undefined,
  });
};
