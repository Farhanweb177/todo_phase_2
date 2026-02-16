import apiClient from './api';

export interface ChatResponse {
  response: string;
  conversation_id: string;
}

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const sendMessage = async (
  userId: string,
  message: string,
  conversationId?: string,
): Promise<ChatResponse> => {
  const body: Record<string, string> = { message };
  if (conversationId) {
    body.conversation_id = conversationId;
  }
  const response = await apiClient.post<ChatResponse>(
    `/api/${userId}/chat`,
    body,
    { timeout: 30000 }, // 30s timeout for AI responses
  );
  return response.data;
};

export const getConversations = async (
  userId: string,
): Promise<Conversation[]> => {
  const response = await apiClient.get<Conversation[]>(
    `/api/${userId}/conversations`,
  );
  return response.data;
};

export const getMessages = async (
  userId: string,
  conversationId: string,
): Promise<ChatMessage[]> => {
  const response = await apiClient.get<ChatMessage[]>(
    `/api/${userId}/conversations/${conversationId}/messages`,
  );
  return response.data;
};
