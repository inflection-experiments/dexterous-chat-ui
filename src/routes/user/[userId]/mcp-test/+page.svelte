<script lang="ts">
	import type { Message, LLMUIBlock } from '$lib/types/chat';
	import type { Conversation } from '$lib/types/botTypes';
	import type { StreamStartEvent, StreamChunkEvent, StreamEndEvent, StreamErrorEvent, ConnectionStatus } from '$lib/types/streaming';
	import type { McpToolName, McpExecutionState } from '$lib/types/mcp.types';
	import type { PageServerData } from './$types';
	import type { BotResponseItem } from '$lib/types/streaming';

	import Icon from '@iconify/svelte';
	import { onMount, onDestroy } from 'svelte';
	import { parseMarkdown } from '$lib/utils/markdownParser';
	import { websocketService } from '$lib/services/websocket.service';
	import { convertBotResponseItemToBlock } from '$lib/utils/chunkTransformer';
	import { executeMcpTool, checkMcpHealth } from '$lib/utils/mcpApi';

	import Sidebar from '$lib/components/Sidebar.svelte';
	import MessageComponent from '$lib/components/Message.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import McpToolSelector from '$lib/components/mcp/McpToolSelector.svelte';
	import McpToolForm from '$lib/components/mcp/McpToolForm.svelte';
	import McpResultViewer from '$lib/components/mcp/McpResultViewer.svelte';
	import McpHealthStatus from '$lib/components/mcp/McpHealthStatus.svelte';

	import {
		sortConversations,
		extractConversationId,
		extractFirstUserMessage,
		convertBackendMessageToUIMessage,
		extractMessagesFromResponse,
		sendChatMessage,
		createConversation,
		fetchConversationMessages,
		deleteConversationAPI,
		createSelectionState,
		buildAssistantMessageFromResult,
		confirmSelections
	} from '$lib/utils/ChatUtils';

	let { data }: { data: PageServerData } = $props();

	// ==========================================
	// CONSTANTS
	// ==========================================
	const USER_ID = '74f22a5f-8ed2-45ce-af2e-ac4c32d824f4';
	const REFERENCE_MESSAGE_ID = '123e4567-e89b-12d3-a456-426655440000';
	const PROJECT_ID = 'df4c6df0-594a-4dcb-8754-49eead9743f3';
	const WEBSOCKET_URL = 'http://localhost:2345';

	// ==========================================
	// MCP TOOL STATE
	// ==========================================
	let selectedTool = $state<McpToolName>('define_entities');
	let healthStatus = $state<'healthy' | 'unhealthy' | 'degraded' | 'unknown'>('unknown');
	let isCheckingHealth = $state(false);
	let lastHealthCheck = $state<string | null>(null);
	let execution = $state<McpExecutionState>({
		isLoading: false,
		result: null,
		error: null,
		executedAt: null,
		duration: null
	});

	// ==========================================
	// CHAT STATE
	// ==========================================
	let conversations = $state<Conversation[]>(sortConversations(data.conversations || []));
	let selectedConversationId = $state('');
	let messages = $state<Message[]>([]);
	let newMessageText = $state('');
	let chatContainer = $state<HTMLElement | null>(null);
	let inputElement = $state<HTMLTextAreaElement | null>(null);
	let isLoading = $state(false);
	let sidebarOpen = $state(true);
	let inputFocused = $state(false);
	let showDeleteConfirm = $state(false);
	let conversationToDelete = $state<string | null>(null);
	let deletingConversation = $state(false);

	// WebSocket streaming state
	let wsConnectionStatus = $state<ConnectionStatus>('disconnected');
	let isStreaming = $state(false);
	let streamingMessageId = $state<string | null>(null);
	let streamingBlocks = $state<LLMUIBlock[]>([]);
	let streamingProgress = $state(0);

	// Parsed content and selection management
	let parsedMessageContent = $state(new Map<number | string, any[]>());
	const selectionManager = createSelectionState();
	let selectionState = $state(selectionManager.getState());
	let conversationTitles = $state(new Map<string, string>());

	// ==========================================
	// MCP HANDLERS
	// ==========================================

	const refreshHealth = async () => {
		isCheckingHealth = true;
		try {
			const response = await checkMcpHealth();
			if (response?.Status === 'success') {
				const s = response.Data?.status;
				healthStatus = (s === 'healthy' || s === 'unhealthy' || s === 'degraded') ? s : 'healthy';
			} else {
				healthStatus = 'unhealthy';
			}
			lastHealthCheck = new Date().toISOString();
		} catch {
			healthStatus = 'unhealthy';
			lastHealthCheck = new Date().toISOString();
		} finally {
			isCheckingHealth = false;
		}
	};

	const handleToolSelect = (tool: McpToolName) => {
		selectedTool = tool;
		execution = { isLoading: false, result: null, error: null, executedAt: null, duration: null };
	};

	const handleSubmit = async (toolName: McpToolName, params: Record<string, any>) => {
		execution = { isLoading: true, result: null, error: null, executedAt: null, duration: null };
		const startTime = performance.now();

		try {
			const result = await executeMcpTool(toolName, params);
			const dur = Math.round(performance.now() - startTime);
			execution = {
				isLoading: false,
				result,
				error: null,
				executedAt: new Date().toISOString(),
				duration: dur
			};
		} catch (err) {
			const dur = Math.round(performance.now() - startTime);
			execution = {
				isLoading: false,
				result: null,
				error: err instanceof Error ? err.message : 'Unknown error occurred',
				executedAt: new Date().toISOString(),
				duration: dur
			};
		}
	};

	// ==========================================
	// WEBSOCKET
	// ==========================================

	// Selection event handlers for TableBlock checkbox interactions
	const onToggleSelection = (e: Event) => {
		const detail = (e as CustomEvent).detail;
		selectionState = selectionManager.toggle(detail.messageId, detail.blockIndex, detail.rowIdx, detail.itemType);
	};

	const onToggleSelectAll = (e: Event) => {
		const detail = (e as CustomEvent).detail;
		selectionState = selectionManager.toggleAll(detail.messageId, detail.blockIndex, detail.totalRows, detail.itemType);
	};

	onMount(() => {
		refreshHealth();
		initializeWebSocket();
		window.addEventListener('toggle-selection', onToggleSelection);
		window.addEventListener('toggle-select-all', onToggleSelectAll);
	});

	onDestroy(() => {
		websocketService.disconnect();
		if (typeof window !== 'undefined') {
			window.removeEventListener('toggle-selection', onToggleSelection);
			window.removeEventListener('toggle-select-all', onToggleSelectAll);
		}
	});

	const initializeWebSocket = () => {
		websocketService.connect(WEBSOCKET_URL, {
			onConnectionChange: handleConnectionChange,
			onStreamStart: handleStreamStart,
			onStreamChunk: handleStreamChunk,
			onStreamEnd: handleStreamEnd,
			onStreamError: handleStreamError
		});
	};

	const handleConnectionChange = (status: ConnectionStatus) => {
		wsConnectionStatus = status;
	};

	const handleStreamStart = (event: StreamStartEvent) => {
		isStreaming = true;
		streamingMessageId = event.messageId;
		streamingBlocks = [];
		streamingProgress = 0;

		const streamingMessage: Message = {
			id: event.messageId,
			Content: '',
			Role: 'Assistant',
			StructuredResponse: { blocks: [] }
		};
		messages = [...messages, streamingMessage];
		scrollToBottom();
	};

	const handleStreamChunk = (event: StreamChunkEvent, block: LLMUIBlock | null) => {
		if (block) {
			streamingBlocks = [...streamingBlocks, block];
			messages = messages.map((msg) => {
				if (msg.id === streamingMessageId) {
					return { ...msg, StructuredResponse: { blocks: streamingBlocks } };
				}
				return msg;
			});
		}
		if (event.chunk.totalChunks) {
			streamingProgress = Math.round((event.chunk.sequence / event.chunk.totalChunks) * 100);
		}
		scrollToBottom();
	};

	const handleStreamEnd = (event: StreamEndEvent) => {
		isStreaming = false;
		isLoading = false;
		streamingProgress = 100;

		messages = messages.map((msg) => {
			if (msg.id === streamingMessageId) {
				const textContent = streamingBlocks
					.filter((b) => b.renderType === 'text' || b.renderType === 'markdown')
					.map((b) => (typeof b.content === 'string' ? b.content : ''))
					.join('\n\n');
				return {
					...msg,
					Content: textContent || 'Response received',
					StructuredResponse: { blocks: streamingBlocks }
				};
			}
			return msg;
		});

		const finalizedMsg = messages.find((m) => m.id === streamingMessageId);
		if (finalizedMsg && finalizedMsg.Content) {
			parsedMessageContent.set(finalizedMsg.id, parseMarkdown(finalizedMsg.Content));
			parsedMessageContent = new Map(parsedMessageContent);
		}

		streamingMessageId = null;
		streamingBlocks = [];
		scrollToBottom();
	};

	const handleStreamError = (event: StreamErrorEvent) => {
		isStreaming = false;
		isLoading = false;
		if (streamingMessageId) {
			messages = messages.map((msg) => {
				if (msg.id === streamingMessageId) {
					return { ...msg, Content: `Error: ${event.error}`, StructuredResponse: undefined };
				}
				return msg;
			});
		}
		streamingMessageId = null;
		streamingBlocks = [];
	};

	// ==========================================
	// CHAT HELPERS
	// ==========================================

	const scrollToBottom = () => {
		if (chatContainer) {
			requestAnimationFrame(() => {
				setTimeout(() => {
					chatContainer?.scrollTo({ top: chatContainer.scrollHeight, behavior: 'smooth' });
				}, 50);
			});
		}
	};

	const adjustTextareaHeight = () => {
		if (inputElement) {
			inputElement.style.height = 'auto';
			const newHeight = Math.min(inputElement.scrollHeight, 200);
			inputElement.style.height = `${newHeight}px`;
		}
	};

	const getParsedContent = (messageId: number | string, content: string): any[] => {
		if (!parsedMessageContent.has(messageId)) {
			parsedMessageContent.set(messageId, parseMarkdown(content));
		}
		return parsedMessageContent.get(messageId)!;
	};

	const extractBotResponseArray = (result: any): BotResponseItem[] | null => {
		if (result?.Data?.BotResponse && Array.isArray(result.Data.BotResponse)) {
			return result.Data.BotResponse;
		}
		if (result?.BotResponse && Array.isArray(result.BotResponse)) {
			return result.BotResponse;
		}
		return null;
	};

	const renderChunksProgressively = async (
		botResponses: BotResponseItem[],
		messageId: string | number
	) => {
		const sortedResponses = [...botResponses].sort((a, b) => (a.Sequence ?? 0) - (b.Sequence ?? 0));
		const totalChunks = sortedResponses.length;

		isStreaming = true;
		streamingMessageId = String(messageId);
		streamingBlocks = [];
		streamingProgress = 0;

		const streamingMessage: Message = {
			id: messageId,
			Content: '',
			Role: 'Assistant',
			StructuredResponse: { blocks: [] }
		};
		messages = [...messages, streamingMessage];
		scrollToBottom();

		for (let i = 0; i < sortedResponses.length; i++) {
			const item = sortedResponses[i];
			const block = convertBotResponseItemToBlock(item);
			if (block) {
				streamingBlocks = [...streamingBlocks, block];
				messages = messages.map((msg) => {
					if (msg.id === messageId) {
						return { ...msg, StructuredResponse: { blocks: streamingBlocks } };
					}
					return msg;
				});
				streamingProgress = Math.round(((i + 1) / totalChunks) * 100);
				scrollToBottom();
				if (i < sortedResponses.length - 1) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}
		}

		const textContent = streamingBlocks
			.filter((b) => b.renderType === 'text' || b.renderType === 'markdown')
			.map((b) => (typeof b.content === 'string' ? b.content : ''))
			.join('\n\n');

		messages = messages.map((msg) => {
			if (msg.id === messageId) {
				return {
					...msg,
					Content: textContent || 'Response received',
					StructuredResponse: { blocks: streamingBlocks }
				};
			}
			return msg;
		});

		if (textContent) {
			parsedMessageContent.set(messageId, parseMarkdown(textContent));
			parsedMessageContent = new Map(parsedMessageContent);
		}

		isStreaming = false;
		isLoading = false;
		streamingMessageId = null;
		streamingProgress = 100;
		scrollToBottom();
	};

	// ==========================================
	// CHAT ACTIONS
	// ==========================================

	// Auto-select latest conversation on mount
	let conversationsInitialized = $state(false);
	$effect(() => {
		if (!conversationsInitialized && conversations.length > 0) {
			conversations.forEach((conv) => {
				const title = (conv as any).Title || (conv as any).title;
				if (title && !conversationTitles.has(conv.id)) {
					conversationTitles.set(conv.id, title);
				}
			});
			conversationTitles = new Map(conversationTitles);

			const latest = conversations[0];
			if (latest?.id) {
				selectConversation(latest.id);
			}
			conversationsInitialized = true;
		}
	});

	$effect(() => {
		if (messages.length > 0) {
			setTimeout(scrollToBottom, 150);
		}
	});

	$effect(() => {
		if (newMessageText !== undefined) {
			adjustTextareaHeight();
		}
	});

	const addUserMessage = (content: string): Message => {
		const userMessage: Message = {
			id: Date.now(),
			Content: content,
			Role: 'User'
		};
		messages = [...messages, userMessage];

		if (selectedConversationId && !conversationTitles.has(selectedConversationId)) {
			conversationTitles.set(selectedConversationId, content);
			conversationTitles = new Map(conversationTitles);
		}

		return userMessage;
	};

	const addAssistantMessage = (message: Message) => {
		messages = [...messages, message];
		if (message.Content) {
			parsedMessageContent.set(message.id, parseMarkdown(message.Content));
		}
		return message;
	};

	const addErrorMessage = () => {
		addAssistantMessage({
			id: Date.now(),
			Content: 'Sorry, I encountered an error. Please try again.',
			Role: 'Assistant'
		});
	};

	const ensureConversation = async (): Promise<boolean> => {
		if (selectedConversationId) return true;

		try {
			const result = await createConversation(PROJECT_ID, data.userId);
			const newId = extractConversationId(result);
			if (!newId) return false;

			selectedConversationId = newId;
			messages = [];
			parsedMessageContent = new Map();
			selectionManager.clear();
			selectionState = selectionManager.getState();

			const newConversation: Conversation = {
				id: newId,
				userId: data.userId,
				status: 'active',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};
			conversations = sortConversations([newConversation, ...conversations]);

			if (wsConnectionStatus === 'connected') {
				websocketService.joinConversation(newId);
			}
			return true;
		} catch (error) {
			console.error('Error creating conversation:', error);
			return false;
		}
	};

	const sendMessage = async () => {
		const trimmedMessage = newMessageText.trim();
		if (!trimmedMessage || isLoading || isStreaming) return;
		if (!(await ensureConversation())) return;

		addUserMessage(trimmedMessage);
		newMessageText = '';
		isLoading = true;
		scrollToBottom();

		try {
			const result = await sendChatMessage(selectedConversationId, trimmedMessage, USER_ID, REFERENCE_MESSAGE_ID);

			if (!isStreaming) {
				const botResponses = extractBotResponseArray(result);
				if (botResponses && botResponses.length > 0) {
					await renderChunksProgressively(botResponses, Date.now() + 1);
				} else {
					const assistantMessage = buildAssistantMessageFromResult(result, Date.now() + 1);
					if (assistantMessage) {
						addAssistantMessage(assistantMessage);
						scrollToBottom();
					} else {
						addAssistantMessage({
							id: Date.now() + 1,
							Content: 'Received response but could not parse it.',
							Role: 'Assistant'
						});
					}
					isLoading = false;
				}
			}
		} catch (error) {
			console.error('Error sending message:', error);
			addErrorMessage();
			isLoading = false;
		}
	};

	const selectConversation = async (conversationId: string) => {
		if (selectedConversationId && wsConnectionStatus === 'connected') {
			websocketService.leaveConversation(selectedConversationId);
		}

		selectedConversationId = conversationId;
		messages = [];
		parsedMessageContent = new Map();
		selectionManager.clear();
		selectionState = selectionManager.getState();

		if (wsConnectionStatus === 'connected') {
			websocketService.joinConversation(conversationId);
		}

		try {
			const result = await fetchConversationMessages(conversationId, data.userId);
			const apiMessages = extractMessagesFromResponse(result);

			if (apiMessages.length > 0) {
				if (!conversationTitles.has(conversationId)) {
					for (const msg of apiMessages) {
						const userMessage = extractFirstUserMessage(msg);
						if (userMessage) {
							conversationTitles.set(conversationId, userMessage);
							conversationTitles = new Map(conversationTitles);
							break;
						}
					}
				}

				const convertedMessages: Message[] = [];
				apiMessages.forEach((backendMsg) => {
					convertedMessages.push(...convertBackendMessageToUIMessage(backendMsg));
				});
				messages = convertedMessages;

				const newParsedContent = new Map<number | string, any[]>();
				messages.forEach((msg) => {
					if (msg.Role === 'Assistant' && msg.Content) {
						newParsedContent.set(msg.id, parseMarkdown(msg.Content));
					}
				});
				parsedMessageContent = newParsedContent;

				await new Promise((resolve) => setTimeout(resolve, 150));
				scrollToBottom();
			}
		} catch (error) {
			console.error('Error loading conversation messages:', error);
		}
	};

	const newChat = async () => {
		try {
			if (selectedConversationId && wsConnectionStatus === 'connected') {
				websocketService.leaveConversation(selectedConversationId);
			}

			const result = await createConversation(PROJECT_ID, data.userId);
			const newConversationId = extractConversationId(result);
			if (!newConversationId) {
				alert('Failed to create conversation: No ID returned from server');
				return;
			}

			selectedConversationId = newConversationId;
			messages = [];
			newMessageText = '';
			parsedMessageContent = new Map();
			selectionManager.clear();
			selectionState = selectionManager.getState();

			const newConv = result.Data || {};
			const newConversation: Conversation = {
				id: newConversationId,
				userId: newConv.userId || data.userId,
				status: (newConv.status as 'active' | 'archived' | 'deleted') || 'active',
				createdAt: newConv.createdAt || new Date().toISOString(),
				updatedAt: newConv.updatedAt || new Date().toISOString()
			};
			conversations = sortConversations([newConversation, ...conversations]);

			if (wsConnectionStatus === 'connected') {
				websocketService.joinConversation(newConversationId);
			}
		} catch (error) {
			console.error('Error creating new conversation:', error);
			alert('Error creating new conversation. Please try again.');
		}

		if (inputElement) {
			inputElement.style.height = 'auto';
			setTimeout(() => {
				if (inputElement) inputElement.style.height = '60px';
			}, 0);
		}
	};

	const deleteConversation = (conversationId: string) => {
		conversationToDelete = conversationId;
		showDeleteConfirm = true;
	};

	const confirmDeleteConversation = async () => {
		if (!conversationToDelete || deletingConversation) return;
		deletingConversation = true;
		try {
			await deleteConversationAPI(conversationToDelete, data.userId);
			conversations = conversations.filter((conv) => conv.id !== conversationToDelete);

			if (selectedConversationId === conversationToDelete) {
				selectedConversationId = '';
				messages = [];
				parsedMessageContent = new Map();
				selectionManager.clear();
				selectionState = selectionManager.getState();
			}
		} catch (error) {
			console.error('Error deleting conversation:', error);
			alert('Failed to delete conversation. Please try again.');
		} finally {
			deletingConversation = false;
			showDeleteConfirm = false;
			conversationToDelete = null;
		}
	};

	const cancelDeleteConversation = () => {
		showDeleteConfirm = false;
		conversationToDelete = null;
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	};

	const collectSelectedItems = (messageId: number | string): any[] => {
		const items: any[] = [];
		const messageSelections = selectionState.get(messageId);

		if (messageSelections) {
			messageSelections.forEach((state: any, blockIndex: number) => {
				if (state.type === 'table-rows' && state.selected.size > 0) {
					const msg = messages.find((m) => m.id === messageId);
					if (msg?.StructuredResponse?.blocks) {
						let tableIdx = 0;
						for (const block of msg.StructuredResponse.blocks) {
							if (block.renderType === 'table') {
								if (tableIdx === blockIndex || blockIndex <= msg.StructuredResponse.blocks.indexOf(block)) {
									if (Array.isArray(block.content) && block.content.length > 0) {
										const rows = block.content as Record<string, any>[];
										Array.from(state.selected).forEach((rowIdx: unknown) => {
											if (rows[rowIdx as number]) {
												items.push(rows[rowIdx as number]);
											}
										});
									}
									break;
								}
								tableIdx++;
							}
						}
					}

					if (items.length === 0) {
						const parsed = parsedMessageContent.get(messageId);
						if (parsed && parsed[blockIndex]?.type === 'table') {
							const table = parsed[blockIndex];
							Array.from(state.selected).forEach((rowIdx: unknown) => {
								const row = table.content.rows[rowIdx as number];
								if (row) {
									const rowData: any = {};
									table.content.headers.forEach((header: string, idx: number) => {
										rowData[header] = row[idx];
									});
									items.push(rowData);
								}
							});
						}
					}
				} else if (state.type === 'list-items' && state.selected.size > 0) {
					const parsed = parsedMessageContent.get(messageId);
					if (parsed && parsed[blockIndex]?.type === 'list') {
						const list = parsed[blockIndex];
						Array.from(state.selected).forEach((itemIdx: unknown) => {
							if (list.content[itemIdx as number]) {
								items.push(list.content[itemIdx as number]);
							}
						});
					}
				}
			});
		}

		return items;
	};

	const handleButtonAction = async (button: any, messageId: number | string) => {
		console.log('Button action:', button, messageId);

		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		try {
			isLoading = true;

			const action = button.action || button.Action || '';
			const entityType = button.entityType || button.EntityType || 'service';

			if (action === 'confirm') {
				const selectedItems = collectSelectedItems(messageId);

				if (selectedItems.length === 0) {
					alert('No items selected. Please select items from the table first.');
					isLoading = false;
					return;
				}

				const result = await confirmSelections({
					conversationId: selectedConversationId,
					projectId: PROJECT_ID,
					responseId: String(messageId),
					entityType,
					selectedItems,
					action: 'confirm',
					userId: USER_ID,
				});

				if (result?.Status === 'success' || result?.status === 'success') {
					addAssistantMessage({
						id: Date.now(),
						Content: `Successfully confirmed and saved ${selectedItems.length} ${entityType}(s) to the database.`,
						Role: 'Assistant'
					});

					selectionManager.clear();
					selectionState = selectionManager.getState();
					scrollToBottom();
				} else {
					addAssistantMessage({
						id: Date.now(),
						Content: `Failed to confirm selections: ${result?.Message || result?.message || 'Unknown error'}`,
						Role: 'Assistant'
					});
				}
			} else if (action === 'reject') {
				const selectedItems = collectSelectedItems(messageId);

				const result = await confirmSelections({
					conversationId: selectedConversationId,
					projectId: PROJECT_ID,
					responseId: String(messageId),
					entityType,
					selectedItems: selectedItems.length > 0 ? selectedItems : [{ rejected: true }],
					action: 'reject',
					userId: USER_ID,
				});

				if (result?.Status === 'success' || result?.status === 'success') {
					addAssistantMessage({
						id: Date.now(),
						Content: `Rejected ${entityType} suggestions.`,
						Role: 'Assistant'
					});

					selectionManager.clear();
					selectionState = selectionManager.getState();
					scrollToBottom();
				}
			} else {
				const buttonLabel = button.text || button.Label || button.label || action;
				const messageText = buttonLabel;

				const selectedItems = collectSelectedItems(messageId);

				addUserMessage(messageText);
				scrollToBottom();

				const result = await sendChatMessage(
					selectedConversationId,
					messageText,
					USER_ID,
					REFERENCE_MESSAGE_ID,
					{
						type: action,
						payload: button.payload || button,
						...(selectedItems.length > 0 && { selectedItems })
					}
				);
				console.log('Button action response:', result?.Status);
			}

			isLoading = false;
		} catch (error) {
			console.error('Error handling button action:', error);
			addAssistantMessage({
				id: Date.now(),
				Content: 'Error processing button action. Please try again.',
				Role: 'Assistant'
			});
			isLoading = false;
		}
	};

	const handleDropdownChange = async (dropdown: any, selectedValue: string, messageId: number | string) => {
		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		try {
			const label = dropdown.label || dropdown.name || 'selection';
			const messageText = `Selected ${label}: ${selectedValue}`;
			addUserMessage(messageText);
			isLoading = true;
			scrollToBottom();

			const result = await sendChatMessage(
				selectedConversationId,
				messageText,
				USER_ID,
				REFERENCE_MESSAGE_ID,
				{
					type: 'dropdown_selection',
					payload: {
						id: dropdown.name || dropdown.id,
						label: dropdown.label,
						selectedValue
					}
				}
			);
			console.log('Dropdown action response:', result?.Status);
			isLoading = false;
		} catch (error) {
			console.error('Error handling dropdown change:', error);
			addErrorMessage();
			isLoading = false;
		}
	};

	const handleRadioChange = async (radioGroup: any, selectedValue: string, messageId: number | string) => {
		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		try {
			const selectedOption = radioGroup.options?.find((opt: any) => opt.value === selectedValue);
			const label = radioGroup.label || radioGroup.name || 'option';
			const messageText = `Selected ${label}: ${selectedOption?.label || selectedValue}`;
			addUserMessage(messageText);
			isLoading = true;
			scrollToBottom();

			const result = await sendChatMessage(
				selectedConversationId,
				messageText,
				USER_ID,
				REFERENCE_MESSAGE_ID,
				{
					type: 'radio_selection',
					payload: {
						id: radioGroup.name || radioGroup.id,
						label: radioGroup.label,
						selectedValue,
						selectedLabel: selectedOption?.label || selectedValue
					}
				}
			);
			console.log('Radio action response:', result?.Status);
			isLoading = false;
		} catch (error) {
			console.error('Error handling radio change:', error);
			addErrorMessage();
			isLoading = false;
		}
	};

	const handleDeleteTableRow = async (messageId: number | string, blockIndex: number, rowIndex: number, rowData: Record<string, string>, entityType: string) => {
		if (selectedConversationId) {
			try {
				const result = await confirmSelections({
					conversationId: selectedConversationId,
					projectId: PROJECT_ID,
					responseId: String(messageId),
					entityType,
					selectedItems: [rowData],
					action: 'reject',
					userId: USER_ID,
				});
				console.log('Row rejected successfully:', rowData, result);
			} catch (error) {
				console.error('Error rejecting row:', error);
			}
		}
	};

	const handleDeleteListItem = (messageId: number | string, blockIndex: number, itemIndex: number) => {
		console.log('Delete list item:', messageId, blockIndex, itemIndex);
	};

	const saveSelectedRowsToStorage = async (messageId: number | string, blockIndex: number, entityType: string) => {
		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		const selectedItems = collectSelectedItems(messageId);

		if (selectedItems.length === 0) {
			alert('No items selected. Please select items first.');
			return;
		}

		try {
			isLoading = true;

			const result = await confirmSelections({
				conversationId: selectedConversationId,
				projectId: PROJECT_ID,
				responseId: String(messageId),
				entityType,
				selectedItems,
				action: 'confirm',
				userId: USER_ID,
			});

			if (result?.Status === 'success' || result?.status === 'success') {
				addAssistantMessage({
					id: Date.now(),
					Content: `Successfully saved ${selectedItems.length} ${entityType}(s) to the database.`,
					Role: 'Assistant'
				});

				selectionManager.clear();
				selectionState = selectionManager.getState();
				scrollToBottom();
			} else {
				alert('Failed to save selected items. Please try again.');
			}

			isLoading = false;
		} catch (error) {
			console.error('Error saving selected items:', error);
			alert('Error saving items to database. Please try again.');
			isLoading = false;
		}
	};

	// Active tab for main content area
	let activeTab = $state<'chat' | 'mcp'>('chat');
</script>

<div class="flex h-screen overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#0f0f23] font-sans text-white antialiased">
	<Sidebar
		open={sidebarOpen}
		{conversations}
		selectedId={selectedConversationId}
		{conversationTitles}
		userId={data.userId}
		loadingConversations={false}
		onNewChat={newChat}
		onSelectConversation={selectConversation}
		onDeleteConversation={deleteConversation}
	/>

	<main class="relative flex h-screen flex-1 flex-col overflow-hidden">
		<!-- Header -->
		<header class="flex items-center justify-between border-b border-white/10 px-6 py-3">
			<div class="flex items-center gap-4">
				<a
					href="/user/{data.userId}/dexterous"
					class="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white"
				>
					<Icon icon="mdi:arrow-left" width="16" height="16" />
					Back to Chat
				</a>
				<div>
					<h1 class="text-lg font-semibold text-white">MCP Testing + Chat</h1>
					<p class="text-xs text-white/40">Test MCP tools and manage conversations</p>
				</div>
			</div>

			<div class="flex items-center gap-4">
				<!-- WebSocket indicator -->
				<div class="flex items-center gap-2">
					<div
						class="h-2 w-2 rounded-full {wsConnectionStatus === 'connected'
							? 'bg-green-500'
							: wsConnectionStatus === 'connecting'
								? 'bg-yellow-500 animate-pulse'
								: wsConnectionStatus === 'error'
									? 'bg-red-500'
									: 'bg-gray-500'}"
					></div>
					<span class="text-xs text-white/50">
						{wsConnectionStatus === 'connected' ? 'Live' : wsConnectionStatus === 'connecting' ? 'Connecting...' : wsConnectionStatus === 'error' ? 'Error' : 'Offline'}
					</span>
				</div>

				<McpHealthStatus
					status={healthStatus}
					isChecking={isCheckingHealth}
					lastChecked={lastHealthCheck}
					onRefresh={refreshHealth}
				/>
			</div>
		</header>

		<!-- Tab Bar -->
		<div class="flex border-b border-white/10 px-6">
			<button
				onclick={() => (activeTab = 'chat')}
				class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors {activeTab === 'chat'
					? 'border-[#ff6b35] text-white'
					: 'border-transparent text-white/50 hover:text-white/80'}"
			>
				<Icon icon="mdi:chat-outline" width="18" height="18" />
				Chat
			</button>
			<button
				onclick={() => (activeTab = 'mcp')}
				class="flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors {activeTab === 'mcp'
					? 'border-[#ff6b35] text-white'
					: 'border-transparent text-white/50 hover:text-white/80'}"
			>
				<Icon icon="mdi:test-tube" width="18" height="18" />
				MCP Tools
			</button>
		</div>

		<!-- Tab Content -->
		{#if activeTab === 'chat'}
			<!-- Chat Panel -->
			<div class="relative flex flex-1 flex-col overflow-hidden">
				{#if messages.length === 0}
					<div class="relative flex h-full flex-col items-center justify-start px-8 pt-16 pb-1 text-center">
						<div class="mb-12 max-w-[600px]">
							<h2 class="m-0 mb-4 bg-gradient-to-br from-white to-white/70 bg-clip-text text-3xl font-extrabold text-transparent" style="letter-spacing: -0.03em;">
								Chat
							</h2>
							<p class="m-0 text-lg leading-relaxed font-normal text-white/60">
								Select a conversation from the sidebar or start a new one to begin chatting.
							</p>
						</div>
					</div>
				{:else}
					<div bind:this={chatContainer} class="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth px-8 py-8 pb-40">
						{#each messages as message (message.id)}
							<MessageComponent
								{message}
								userId={data.userId}
								parsedContent={getParsedContent(message.id, message.Content)}
								{selectionState}
								onButtonAction={handleButtonAction}
								onDeleteRow={handleDeleteTableRow}
								onDeleteItem={handleDeleteListItem}
								onSaveSelected={saveSelectedRowsToStorage}
								onDropdownChange={handleDropdownChange}
								onRadioChange={handleRadioChange}
							/>
						{/each}

						{#if isLoading && !isStreaming}
							<div class="mb-6 flex animate-[fadeInUp_0.4s_ease-out] items-start gap-3">
								<div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
									<Icon icon="mdi:layers" width="20" height="20" />
								</div>
								<div class="inline-block rounded-[18px] rounded-bl-sm border border-white/10 bg-white/8 px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-md">
									<div class="flex items-center gap-2">
										<span class="loader-dot"></span>
										<span class="loader-dot" style="animation-delay: 0.15s;"></span>
										<span class="loader-dot" style="animation-delay: 0.3s;"></span>
									</div>
								</div>
							</div>
						{/if}

						{#if isStreaming}
							<div class="mb-2 flex items-center gap-2 px-12 text-xs text-white/50">
								<div class="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
									<div
										class="h-full bg-gradient-to-r from-[#ff6b35] to-[#f7931e] transition-all duration-300"
										style="width: {streamingProgress}%"
									></div>
								</div>
								<span class="min-w-[40px] text-right">{streamingProgress}%</span>
							</div>
						{/if}
					</div>
				{/if}

				<!-- Input Area -->
				<div class="absolute right-0 bottom-0 left-0 px-8 py-6 backdrop-blur-xl" style="background: linear-gradient(180deg, transparent 0%, rgba(10, 10, 26, 0.95) 20%, rgba(10, 10, 26, 0.98) 100%);">
					<div class="mx-auto flex max-w-[1000px] items-end gap-3">
						<textarea
							bind:this={inputElement}
							bind:value={newMessageText}
							onkeydown={handleKeydown}
							oninput={adjustTextareaHeight}
							onfocus={() => (inputFocused = true)}
							onblur={() => (inputFocused = false)}
							placeholder="Type your message here..."
							class="flex-1 resize-none overflow-y-auto rounded-xl border-2 bg-white/5 px-4 py-3 text-[0.95rem] leading-[1.5] text-white transition-all duration-300 placeholder:text-white/40 {inputFocused
								? 'border-[rgba(255,107,53,0.4)] bg-white/8 ring-2 ring-[rgba(255,107,53,0.2)] outline-none'
								: 'border-white/10 outline-none'}"
							style="min-height: 60px; max-height: 200px;"
							disabled={isLoading}
						></textarea>

						<button
							onclick={sendMessage}
							disabled={!newMessageText.trim() || isLoading}
							class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-none transition-all duration-200 {newMessageText.trim() && !isLoading
								? 'cursor-pointer bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]'
								: 'cursor-not-allowed bg-white/10 text-white/50'}"
						>
							<Icon icon="mdi:send" width="20" height="20" />
						</button>
					</div>
				</div>
			</div>
		{:else}
			<!-- MCP Tools Panel -->
			<div class="flex-1 overflow-y-auto px-6 py-8">
				<div class="mx-auto max-w-[1200px]">
					<!-- Tool Selector -->
					<McpToolSelector selectedTool={selectedTool} onSelect={handleToolSelect} />

					<!-- Two-Column Layout -->
					<div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
						<!-- Left: Form -->
						<McpToolForm
							toolName={selectedTool}
							userId={data.userId}
							isLoading={execution.isLoading}
							onSubmit={handleSubmit}
						/>

						<!-- Right: Results -->
						<div>
							{#if execution.isLoading}
								<div class="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 backdrop-blur-sm">
									<div class="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#ff6b35]"></div>
									<p class="text-sm text-white/60">Executing {selectedTool}...</p>
								</div>
							{:else if execution.error}
								<div class="rounded-2xl border border-red-400/30 bg-red-500/10 p-6">
									<div class="flex items-start gap-3">
										<Icon icon="mdi:alert-circle" width="24" height="24" class="mt-0.5 text-red-400" />
										<div>
											<p class="font-medium text-red-400">Request Failed</p>
											<p class="mt-1 text-sm text-red-300/80">{execution.error}</p>
											{#if execution.duration !== null}
												<p class="mt-2 text-xs text-red-300/50">Duration: {execution.duration}ms</p>
											{/if}
										</div>
									</div>
								</div>
							{:else if execution.result}
								<McpResultViewer
									result={execution.result}
									toolName={selectedTool}
									duration={execution.duration}
									executedAt={execution.executedAt}
								/>
							{:else}
								<div class="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16 backdrop-blur-sm">
									<Icon icon="mdi:test-tube" width="48" height="48" class="mb-3 text-white/20" />
									<p class="text-sm text-white/40">Select a tool and execute to see results</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}
	</main>

	<ConfirmDialog
		open={showDeleteConfirm}
		title="Delete Conversation"
		message="Are you sure you want to delete this conversation? This action cannot be undone."
		confirmText="Confirm Delete"
		cancelText="Cancel"
		variant="danger"
		isLoading={deletingConversation}
		onConfirm={confirmDeleteConversation}
		onCancel={cancelDeleteConversation}
	/>
</div>

<style>
	@keyframes fadeInUp {
		from { opacity: 0; transform: translateY(15px); }
		to { opacity: 1; transform: translateY(0); }
	}

	@keyframes bounceDot {
		0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
		40% { transform: translateY(-6px); opacity: 1; }
	}

	.loader-dot {
		height: 0.5rem;
		width: 0.5rem;
		border-radius: 9999px;
		background-color: rgba(255, 255, 255, 0.7);
		animation: bounceDot 0.9s infinite ease-in-out;
	}
</style>
