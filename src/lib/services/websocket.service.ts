import { io, Socket } from 'socket.io-client';
import type {
	StreamStartEvent,
	StreamChunkEvent,
	StreamEndEvent,
	StreamErrorEvent,
	CompleteMessageEvent,
	ResponseChunk,
	StreamingMessage,
	ConnectionStatus
} from '$lib/types/streaming';
import type { LLMUIBlock } from '$lib/types/chat';
import { convertChunkToBlock } from '$lib/utils/chunkTransformer';

// ==========================================
// EVENT CALLBACKS
// ==========================================

export interface WebSocketCallbacks {
	onConnectionChange?: (status: ConnectionStatus) => void;
	onStreamStart?: (event: StreamStartEvent) => void;
	onStreamChunk?: (event: StreamChunkEvent, block: LLMUIBlock | null) => void;
	onStreamEnd?: (event: StreamEndEvent) => void;
	onStreamError?: (event: StreamErrorEvent) => void;
	onCompleteMessage?: (event: CompleteMessageEvent) => void;
}

// ==========================================
// WEBSOCKET SERVICE
// ==========================================

class WebSocketService {
	private socket: Socket | null = null;
	private callbacks: WebSocketCallbacks = {};
	private currentConversationId: string | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;

	// Current streaming state
	private streamingMessage: StreamingMessage | null = null;

	/**
	 * Initialize WebSocket connection
	 */
	connect(serverUrl: string, callbacks?: WebSocketCallbacks): void {
		if (this.socket?.connected) {
			console.log('WebSocket already connected');
			return;
		}

		this.callbacks = callbacks || {};
		this.notifyConnectionChange('connecting');

		this.socket = io(serverUrl, {
			transports: ['websocket', 'polling'],
			reconnection: true,
			reconnectionAttempts: this.maxReconnectAttempts,
			reconnectionDelay: this.reconnectDelay,
			timeout: 10000
		});

		this.setupEventListeners();
	}

	/**
	 * Setup all socket event listeners
	 */
	private setupEventListeners(): void {
		if (!this.socket) return;

		// Connection events
		this.socket.on('connect', () => {
			console.log('WebSocket connected:', this.socket?.id);
			this.reconnectAttempts = 0;
			this.notifyConnectionChange('connected');

			// Rejoin conversation if we were in one
			if (this.currentConversationId) {
				this.joinConversation(this.currentConversationId);
			}
		});

		this.socket.on('disconnect', (reason) => {
			console.log('WebSocket disconnected:', reason);
			this.notifyConnectionChange('disconnected');
		});

		this.socket.on('connect_error', (error) => {
			console.error('WebSocket connection error:', error);
			this.reconnectAttempts++;
			if (this.reconnectAttempts >= this.maxReconnectAttempts) {
				this.notifyConnectionChange('error');
			}
		});

		// Streaming events
		this.socket.on('stream-start', this.handleStreamStart.bind(this));
		this.socket.on('stream-chunk', this.handleStreamChunk.bind(this));
		this.socket.on('stream-end', this.handleStreamEnd.bind(this));
		this.socket.on('stream-error', this.handleStreamError.bind(this));

		// Complete message event (fallback for non-streaming)
		this.socket.on('message', this.handleCompleteMessage.bind(this));
	}

	/**
	 * Handle stream start event
	 */
	private handleStreamStart(event: StreamStartEvent): void {
		console.log('Stream started:', event.messageId, 'expecting', event.totalChunks, 'chunks');

		// Initialize streaming message state
		this.streamingMessage = {
			messageId: event.messageId,
			conversationId: event.conversationId,
			chunks: [],
			blocks: [],
			isComplete: false,
			isStreaming: true,
			totalChunks: event.totalChunks,
			receivedChunks: 0
		};

		this.callbacks.onStreamStart?.(event);
	}

	/**
	 * Handle stream chunk event
	 */
	private handleStreamChunk(event: StreamChunkEvent): void {
		const { chunk } = event;
		console.log(`Chunk ${chunk.sequence}/${chunk.totalChunks} received:`, chunk.chunkType);

		if (this.streamingMessage) {
			// Add chunk to collection
			this.streamingMessage.chunks.push(chunk);
			this.streamingMessage.receivedChunks++;

			// Convert chunk to LLMUIBlock
			const block = convertChunkToBlock(chunk);
			if (block) {
				this.streamingMessage.blocks.push(block);
			}

			this.callbacks.onStreamChunk?.(event, block);
		}
	}

	/**
	 * Handle stream end event
	 */
	private handleStreamEnd(event: StreamEndEvent): void {
		console.log('Stream ended:', event.messageId, 'total', event.totalChunks, 'chunks');

		if (this.streamingMessage) {
			this.streamingMessage.isComplete = true;
			this.streamingMessage.isStreaming = false;
		}

		this.callbacks.onStreamEnd?.(event);
	}

	/**
	 * Handle stream error event
	 */
	private handleStreamError(event: StreamErrorEvent): void {
		console.error('Stream error:', event.error);

		if (this.streamingMessage) {
			this.streamingMessage.isStreaming = false;
			this.streamingMessage.error = event.error;
		}

		this.callbacks.onStreamError?.(event);
	}

	/**
	 * Handle complete message event (fallback)
	 */
	private handleCompleteMessage(event: CompleteMessageEvent): void {
		// If we already received this via streaming, ignore
		if (this.streamingMessage?.messageId === event.messageId && this.streamingMessage?.isComplete) {
			return;
		}

		console.log('Complete message received:', event.messageId);
		this.callbacks.onCompleteMessage?.(event);
	}

	/**
	 * Join a conversation room
	 */
	joinConversation(conversationId: string): void {
		if (!this.socket?.connected) {
			console.warn('Cannot join conversation: socket not connected');
			this.currentConversationId = conversationId; // Store for when we reconnect
			return;
		}

		// Leave previous conversation if any
		if (this.currentConversationId && this.currentConversationId !== conversationId) {
			this.leaveConversation(this.currentConversationId);
		}

		this.currentConversationId = conversationId;
		this.socket.emit('join-conversation', conversationId);
		console.log('Joined conversation:', conversationId);
	}

	/**
	 * Leave a conversation room
	 */
	leaveConversation(conversationId: string): void {
		if (!this.socket?.connected) return;

		this.socket.emit('leave-conversation', conversationId);
		console.log('Left conversation:', conversationId);

		if (this.currentConversationId === conversationId) {
			this.currentConversationId = null;
		}
	}

	/**
	 * Get current streaming message state
	 */
	getStreamingMessage(): StreamingMessage | null {
		return this.streamingMessage;
	}

	/**
	 * Clear streaming message state
	 */
	clearStreamingMessage(): void {
		this.streamingMessage = null;
	}

	/**
	 * Check if currently streaming
	 */
	isStreaming(): boolean {
		return this.streamingMessage?.isStreaming ?? false;
	}

	/**
	 * Get connection status
	 */
	isConnected(): boolean {
		return this.socket?.connected ?? false;
	}

	/**
	 * Get socket ID
	 */
	getSocketId(): string | undefined {
		return this.socket?.id;
	}

	/**
	 * Update callbacks
	 */
	setCallbacks(callbacks: WebSocketCallbacks): void {
		this.callbacks = { ...this.callbacks, ...callbacks };
	}

	/**
	 * Notify connection change
	 */
	private notifyConnectionChange(status: ConnectionStatus): void {
		this.callbacks.onConnectionChange?.(status);
	}

	/**
	 * Disconnect from server
	 */
	disconnect(): void {
		if (this.socket) {
			this.socket.disconnect();
			this.socket = null;
		}
		this.currentConversationId = null;
		this.streamingMessage = null;
		this.notifyConnectionChange('disconnected');
	}
}

// Export singleton instance
export const websocketService = new WebSocketService();
