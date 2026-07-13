import type { ChatThread } from '../types/iso';
import { requestIsoApi } from './isoApiClient';

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

export async function listChatThreadsApi(userId: string): Promise<ChatThread[]> {
  const threads = await requestIsoApi<ApiChatThread[]>(`/chat/threads/${userId}`);
  return threads.map(toChatThread);
}

export async function openDirectThreadApi(participantIds: string[]): Promise<ChatThread> {
  return openChatThreadApi({ participantIds });
}

export async function openChatThreadApi(input: {
  participantIds: string[];
  title?: string;
}): Promise<ChatThread> {
  const thread = await requestIsoApi<ApiChatThread>('/chat/threads/direct', {
    method: 'POST',
    body: JSON.stringify(input),
  });

  return toChatThread(thread);
}

export async function sendChatMessageApi(
  threadId: string,
  authorId: string,
  content: string
): Promise<ChatThread> {
  const thread = await requestIsoApi<ApiChatThread>(`/chat/threads/${threadId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ authorId, content }),
  });

  return toChatThread(thread);
}

export async function markThreadAsReadApi(
  threadId: string,
  userId: string
): Promise<ChatThread> {
  const thread = await requestIsoApi<ApiChatThread>(`/chat/threads/${threadId}/read`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });

  return toChatThread(thread);
}
