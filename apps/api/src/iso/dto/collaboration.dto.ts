export type OpenDirectThreadDto = {
  participantIds: string[];
  title?: string;
};

export type SendChatMessageDto = {
  authorId: string;
  content: string;
};

export type MarkThreadAsReadDto = {
  userId: string;
};
