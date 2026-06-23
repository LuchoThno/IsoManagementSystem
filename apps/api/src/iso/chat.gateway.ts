import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

type SerializedChatThread = {
  id: string;
  participantIds: string[];
  updatedAt: Date;
  messages: Array<{
    id: string;
    authorId: string;
    content: string;
    createdAt: Date;
    readBy: string[];
  }>;
};

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const rawUserId = client.handshake.query.userId;
    const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

    if (typeof userId === 'string' && userId.trim()) {
      client.join(this.getUserRoom(userId));
    }
  }

  handleDisconnect(_client: Socket) {}

  emitThreadUpsert(thread: SerializedChatThread) {
    const rooms = new Set([
      this.getThreadRoom(thread.id),
      ...thread.participantIds.map((participantId) => this.getUserRoom(participantId)),
    ]);

    for (const room of rooms) {
      this.server.to(room).emit('chat:thread-upserted', thread);
    }
  }

  joinThreadRoom(client: Socket, threadId: string) {
    client.join(this.getThreadRoom(threadId));
  }

  leaveThreadRoom(client: Socket, threadId: string) {
    client.leave(this.getThreadRoom(threadId));
  }

  private getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  private getThreadRoom(threadId: string) {
    return `thread:${threadId}`;
  }
}
