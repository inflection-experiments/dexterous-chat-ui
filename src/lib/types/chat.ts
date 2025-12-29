import type { StructuredResponse } from './structuredResponse';

export interface Message {
  id: number | string;
  Content: string;
  Role: 'User' | 'Assistant';
  StructuredResponse?: StructuredResponse; // Optional structured response for Assistant messages
}

export interface ChatContent {
  type: 'text';
  data: {
    text: string;
  };
}

export interface ChatRequest {
  ConversationId: string;
  UserId: string;
  ReferenceMessageId?: string;
  Channel: string;
  Contents: ChatContent[];
}

export interface ChatResponse {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
}