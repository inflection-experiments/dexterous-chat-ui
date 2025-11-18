export interface Message {
  id: number | string;
  Content: string;
  Role: 'User' | 'Assistant';
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

export interface StructuredResponse {
  Message: string;
  Data?: any[];
  ResponseFormat?: 'json' | 'sql' | 'image' | 'table' | 'text';
  Metadata?: {
    inputType?: string;
    hasInputData?: boolean;
    confidence?: number;
  };
  SuggestedActions?: string[];
}