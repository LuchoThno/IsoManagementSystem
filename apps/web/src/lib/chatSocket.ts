import { io, type Socket } from 'socket.io-client';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const getSocketBaseUrl = () => {
  const configured = import.meta.env.VITE_SOCKET_URL;
  if (typeof configured === 'string' && configured.trim()) {
    return configured;
  }

  return API_BASE.replace(/\/api\/?$/, '');
};

export const connectChatSocket = (userId: string): Socket =>
  io(getSocketBaseUrl(), {
    transports: ['websocket', 'polling'],
    query: {
      userId,
    },
  });
