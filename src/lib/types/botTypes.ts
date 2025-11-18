export interface BaseContent<T extends string = string> {
  type: T;
  data: unknown;
  metadata?: Record<string, unknown>;
}

// ========== Content Types ==========

export interface TextContent extends BaseContent<'text'> {
  data: {
    text: string;
    format?: 'plain' | 'markdown' | 'html';
  };
}

export interface MediaContent extends BaseContent<'media'> {
  data: {
    url?: string;
    base64?: string;
    filename?: string;
    mimeType?: string;
    alt?: string;
    caption?: string;
  };
}

export interface TableContent extends BaseContent<'table'> {
  data: {
    headers: string[];
    rows: (string | number)[][];
    caption?: string;
    sourceType?: 'csv' | 'markdown' | 'html';
    sortable?: boolean;
  };
}

export interface FileContent extends BaseContent<'file'> {
  data: {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
  };
}

export interface AudioContent extends BaseContent<'audio'> {
  data: {
    url: string;
    mimeType: string;
    transcription?: string;
  };
}

export interface JsonContent extends BaseContent<'json'> {
  data: {
    json: any;
    schema?: any;
    format?: 'pretty' | 'compact';
    downloadUrl?: string;
  };
}

export interface ChartContent extends BaseContent<'chart'> {
  data: {
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'area' | 'doughnut';
    data: any;
    options?: any;
    title?: string;
    description?: string;
  };
}

export interface CodeContent extends BaseContent<'code'> {
  data: {
    code: string;
    language: string;
    filename?: string;
    syntaxHighlight?: boolean;
    executable?: boolean;
  };
}

export interface ActionContent extends BaseContent<'action'> {
  data: {
    actions: string[];
    primaryAction?: string;
    callback?: string;
  };
}

// Union of all supported content types
export type ContentUnion =
  | TextContent
  | MediaContent
  | TableContent
  | FileContent
  | AudioContent
  | JsonContent
  | ChartContent
  | CodeContent
  | ActionContent;

// ========== Message Metadata ==========

export interface MessageMetadata {
  processingTime?: number;
  tokensUsed?: number;
  model?: string;
  confidence?: number;
  suggestedActions?: string[];
  apiVersion?: string;
  source?: string;
  tags?: string[];
}

// ========== Error Types ==========

export interface MessageError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
}

// ========== Message Request ==========

export interface UserMessage {
  id: string;
  conversationId: string;
  userId: string;
  timestamp: string;
  content: ContentUnion[];
  replyTo?: string;
  expectsResponse?: boolean;
  metadata?: MessageMetadata;
}

// ========== Bot Response ==========

export interface BotMessage {
  id: string;
  conversationId: string;
  botId: string;
  timestamp: string;
  inReplyTo: string;
  content: ContentUnion[];
  status: 'pending' | 'streaming' | 'success' | 'error' | 'partial';
  error?: MessageError;
  metadata?: MessageMetadata;
  progress?: number; // 0-100 for streaming
}

// ========== Conversation Types ==========

export interface Conversation {
  id: string;
  userId: string;
  botId: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'deleted';
  metadata?: MessageMetadata;
}

// ========== Bot Configuration ==========

export interface BotConfig {
  id: string;
  name: string;
  description?: string;
  capabilities: string[];
  supportedContentTypes: ContentUnion['type'][];
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, unknown>;
}

// ========== Utility Types ==========

export type MessageType = 'user' | 'bot';

export type ContentType = ContentUnion['type'];

export type MessageStatus = BotMessage['status'];

// ========== Event Types ==========

export interface MessageEvent {
  type: 'message_sent' | 'message_received' | 'message_error';
  message: UserMessage | BotMessage;
  timestamp: string;
}

export interface StreamEvent {
  type: 'stream_start' | 'stream_chunk' | 'stream_end' | 'stream_error';
  messageId: string;
  data?: any;
  timestamp: string;
}
