// ==========================================
// STREAMING TYPES FOR WEBSOCKET INTEGRATION
// ==========================================
// Types matching backend streaming.types.ts

import type { LLMUIBlock } from './chat';

// ==========================================
// CHUNK TYPES - ALL UI SCENARIOS
// ==========================================

export enum ChunkType {
	// === TEXT CONTENT ===
	INTRODUCTION = 'introduction',
	DESCRIPTION = 'description',
	EXPLANATION = 'explanation',
	CLOSING = 'closing',

	// === DATA DISPLAY ===
	TABLE = 'table',
	TWO_COLUMN_TABLE = 'two_column_table',
	LIST = 'list',
	CODE = 'code',
	JSON_VIEW = 'json_view',

	// === SUMMARY/INFO ===
	SUMMARY = 'summary',
	INFO = 'info',

	// === INTERACTIVE ELEMENTS ===
	BUTTON = 'button',
	BUTTON_GROUP = 'button_group',
	DROPDOWN = 'dropdown',
	RADIO = 'radio',
	CHECKBOX = 'checkbox',
	FORM = 'form',
	LINK = 'link',

	// === INPUT ELEMENTS ===
	DATE_PICKER = 'date_picker',
	COLOR_PICKER = 'color_picker',
	FILE_UPLOADER = 'file_uploader',
	SLIDER = 'slider',
	TOGGLE = 'toggle',

	// === STATUS/FEEDBACK ===
	PROGRESS = 'progress',
	ERROR = 'error',
	SUCCESS = 'success',
	WARNING = 'warning',

	// === NEXT STEPS ===
	NEXT_STEPS = 'next_steps'
}

// ==========================================
// BOT RESPONSE ITEM (from backend)
// ==========================================

export interface BotResponseItem {
	Content: string | Record<string, any> | any[];
	DataType: 'Text' | 'Json' | 'Object';
	Format: 'Plain' | 'Markdown' | 'Object' | 'ObjectArray';
	RenderType: string;
	Sequence: number;
}

// ==========================================
// RESPONSE CHUNK
// ==========================================

export interface ResponseChunk {
	chunkType: ChunkType;
	sequence: number;
	item: BotResponseItem;
	isLast: boolean;
	totalChunks: number;
	messageId?: string;
}

// ==========================================
// WEBSOCKET EVENTS
// ==========================================

export interface StreamStartEvent {
	messageId: string;
	conversationId: string;
	userId: string;
	totalChunks?: number;
	timestamp: string;
}

export interface StreamChunkEvent {
	messageId: string;
	conversationId: string;
	userId: string;
	chunk: ResponseChunk;
	timestamp: string;
}

export interface StreamEndEvent {
	messageId: string;
	conversationId: string;
	userId: string;
	totalChunks: number;
	timestamp: string;
}

export interface StreamErrorEvent {
	messageId: string;
	conversationId: string;
	userId: string;
	error: string;
	timestamp: string;
}

export interface CompleteMessageEvent {
	id: string;
	ConversationId: string;
	UserId: string;
	UserContent: any;
	AssistantContent: any;
	messageId: string;
	Metadata: any;
	CreatedAt: string;
}

// ==========================================
// STREAMING MESSAGE STATE
// ==========================================

export interface StreamingMessage {
	messageId: string;
	conversationId: string;
	chunks: ResponseChunk[];
	blocks: LLMUIBlock[];
	isComplete: boolean;
	isStreaming: boolean;
	error?: string;
	totalChunks?: number;
	receivedChunks: number;
}

// ==========================================
// WEBSOCKET CONNECTION STATE
// ==========================================

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface WebSocketState {
	status: ConnectionStatus;
	currentConversationId: string | null;
	streamingMessage: StreamingMessage | null;
	error: string | null;
}
