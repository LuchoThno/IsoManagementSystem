import type { ChatThread } from '../types/iso';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

type ApiChatThread = Omit<ChatThread, 'updatedAt' | 'messages'> & {
  updatedAt: string;
  messages: Array<
    Omit<ChatThread['messages'][number], 'createdAt'> & {
      createdAt: string;
    }
  >;
};

const toChatThread = (thread: ApiChatThread): ChatThread => ({
  ...thread,
  updatedAt: new Date(thread.updatedAt),
  messages: (thread.messages ?? []).map((message) => ({
    ...message,
    createdAt: new Date(message.createdAt),
  })),
});

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}/iso${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function listChatThreadsApi(userId: string): Promise<ChatThread[]> {
  const threads = await request<ApiChatThread[]>(`/chat/threads/${userId}`);
  return threads.map(toChatThread);
}

export async function openDirectThreadApi(participantIds: string[]): Promise<ChatThread> {
  const thread = await request<ApiChatThread>('/chat/threads/direct', {
    method: 'POST',
    body: JSON.stringify({ participantIds }),
  });

  return toChatThread(thread);
}

export async function sendChatMessageApi(
  threadId: string,
  authorId: string,
  content: string
): Promise<ChatThread> {
  const thread = await request<ApiChatThread>(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ authorId, content }),
  });

  return toChatThread(thread);
}

export async function markThreadAsReadApi(
  threadId: string,
  userId: string
): Promise<ChatThread> {
  const thread = await request<ApiChatThread>(`/chat/threads/${threadId}/read`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

  return toChatThread(thread);
}
