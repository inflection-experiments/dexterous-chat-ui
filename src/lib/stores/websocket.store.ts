import { writable, derived, get } from 'svelte/store';
import type {
	ConnectionStatus,
	StreamingMessage,
	StreamStartEvent,
	StreamChunkEvent,
	StreamEndEvent,
	StreamErrorEvent
} from '$lib/types/streaming';
import type { LLMUIBlock } from '$lib/types/chat';
import { websocketService } from '$lib/services/websocket.service';

// ==========================================
// STORE STATE
// ==========================================

interface WebSocketStoreState {
	connectionStatus: ConnectionStatus;
	currentConversationId: string | null;
	streamingMessage: StreamingMessage | null;
	error: string | null;
}

const initialState: WebSocketStoreState = {
	connectionStatus: 'disconnected',
	currentConversationId: null,
	streamingMessage: null,
	error: null
};

// ==========================================
// CREATE STORE
// ==========================================

function createWebSocketStore() {
	const { subscribe, set, update } = writable<WebSocketStoreState>(initialState);

	// Derived stores for convenience
	const connectionStatus = derived({ subscribe }, ($state) => $state.connectionStatus);
	const isConnected = derived({ subscribe }, ($state) => $state.connectionStatus === 'connected');
	const isStreaming = derived({ subscribe }, ($state) => $state.streamingMessage?.isStreaming ?? false);
	const streamingBlocks = derived({ subscribe }, ($state) => $state.streamingMessage?.blocks ?? []);
	const streamingProgress = derived({ subscribe }, ($state) => {
		const msg = $state.streamingMessage;
		if (!msg || !msg.totalChunks) return 0;
		return Math.round((msg.receivedChunks / msg.totalChunks) * 100);
	});

	return {
		subscribe,
		connectionStatus,
		isConnected,
		isStreaming,
		streamingBlocks,
		streamingProgress,

		/**
		 * Initialize WebSocket connection
		 */
		connect: (serverUrl: string) => {
			websocketService.connect(serverUrl, {
				onConnectionChange: (status) => {
					update((state) => ({ ...state, connectionStatus: status, error: null }));
				},
				onStreamStart: (event: StreamStartEvent) => {
					update((state) => ({
						...state,
						streamingMessage: {
							messageId: event.messageId,
							conversationId: event.conversationId,
							chunks: [],
							blocks: [],
							isComplete: false,
							isStreaming: true,
							totalChunks: event.totalChunks,
							receivedChunks: 0
						}
					}));
				},
				onStreamChunk: (event: StreamChunkEvent, block: LLMUIBlock | null) => {
					update((state) => {
						if (!state.streamingMessage) return state;

						const newChunks = [...state.streamingMessage.chunks, event.chunk];
						const newBlocks = block
							? [...state.streamingMessage.blocks, block]
							: state.streamingMessage.blocks;

						return {
							...state,
							streamingMessage: {
								...state.streamingMessage,
								chunks: newChunks,
								blocks: newBlocks,
								receivedChunks: state.streamingMessage.receivedChunks + 1
							}
						};
					});
				},
				onStreamEnd: (event: StreamEndEvent) => {
					update((state) => {
						if (!state.streamingMessage) return state;
						return {
							...state,
							streamingMessage: {
								...state.streamingMessage,
								isComplete: true,
								isStreaming: false
							}
						};
					});
				},
				onStreamError: (event: StreamErrorEvent) => {
					update((state) => ({
						...state,
						error: event.error,
						streamingMessage: state.streamingMessage
							? {
									...state.streamingMessage,
									isStreaming: false,
									error: event.error
								}
							: null
					}));
				}
			});
		},

		/**
		 * Disconnect from WebSocket server
		 */
		disconnect: () => {
			websocketService.disconnect();
			set(initialState);
		},

		/**
		 * Join a conversation room
		 */
		joinConversation: (conversationId: string) => {
			websocketService.joinConversation(conversationId);
			update((state) => ({ ...state, currentConversationId: conversationId }));
		},

		/**
		 * Leave a conversation room
		 */
		leaveConversation: (conversationId: string) => {
			websocketService.leaveConversation(conversationId);
			update((state) => ({
				...state,
				currentConversationId:
					state.currentConversationId === conversationId ? null : state.currentConversationId
			}));
		},

		/**
		 * Clear streaming message state
		 */
		clearStreamingMessage: () => {
			websocketService.clearStreamingMessage();
			update((state) => ({ ...state, streamingMessage: null }));
		},

		/**
		 * Get current streaming message
		 */
		getStreamingMessage: (): StreamingMessage | null => {
			return get({ subscribe }).streamingMessage;
		},

		/**
		 * Clear error
		 */
		clearError: () => {
			update((state) => ({ ...state, error: null }));
		},

		/**
		 * Reset store to initial state
		 */
		reset: () => {
			websocketService.disconnect();
			set(initialState);
		}
	};
}

// Export singleton store
export const websocketStore = createWebSocketStore();
