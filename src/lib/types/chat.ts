import type { Content, ChatMessage, ChatMessageCreateModel, ChatMessageResponseDto, MessageRole, uuid } from './backendTypes';

// ==========================================
// LLM UI RESPONSE TYPES
// ==========================================

/**
 * Indicates the raw nature of the response coming from the LLM
 * - "text" → treat content as plain string
 * - "json" → parse and validate structured data
 */
export type DataType = "text" | "json";

/**
 * The actual payload produced by the LLM
 */
export type LLMContent =
  | string
  | number
  | Record<string, any>
  | Array<Record<string, any>>;

/**
 * Defines how the frontend should INTERPRET the content structure
 * - "text"        → plain string
 * - "markdown"    → markdown-formatted string
 * - "object"      → single JSON object
 * - "objectArray" → array of objects (rows, items)
 */
export type FormatType =
  | "text"
  | "markdown"
  | "object"
  | "objectArray";

/**
 * Tells the frontend HOW the content should be shown visually in the UI
 */
export type RenderType =
  | "text"
  | "markdown"
  | "table"
  | "list"
  | "code"
  | "json"
  | "button"
  | "dropdown"
  | "radioButton"
  | "link"
  | "form"
  | "datePicker"
  | "colorPicker"
  | "fileUploader"
  | "progressBar"
  | "toggleSwitch"
  | "slider";

/**
 * A single renderable unit sent from backend to frontend
 */
export interface LLMUIBlock {
  datatype: DataType;
  format: FormatType;
  renderType: RenderType;
  content: LLMContent;
}

/**
 * Complete response containing multiple blocks
 */
export interface LLMUIResponse {
  blocks: LLMUIBlock[];
}

export interface StructuredResponse {
  blocks: LLMUIBlock[];
}

export interface Message {
  id: number | string;
  Content: string;
  Role: 'User' | 'Assistant';
  StructuredResponse?: StructuredResponse; // Optional structured response for Assistant messages
}

// Re-export backend types for convenience
export type { Content, ChatMessage, ChatMessageCreateModel, ChatMessageResponseDto, MessageRole, uuid };

// Legacy types for backward compatibility
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