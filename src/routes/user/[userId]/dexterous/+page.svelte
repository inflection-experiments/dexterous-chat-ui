<script lang="ts">
	import type { Message } from '$lib/types/chat.ts';
	import type { Conversation } from '$lib/types/botTypes.ts';
	import Icon from '@iconify/svelte';
	import type { PageServerData } from './$types.ts';
	import {
		parseMarkdown,
		parseTable,
		parseInlineFormatting,
		reconstructMarkdown,
		deleteTableRowFromBlocks,
		deleteListItemFromBlocks
	} from '$lib/utils/markdownParser.ts';
	import {
		loadFromLocalStorage,
		saveToLocalStorage,
		getConversationData,
		saveConversationData,
		addSelectedItems,
		type SelectedItem
	} from '$lib/utils/localStorage.ts';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';

	let { data }: { data: PageServerData } = $props();

	const userId = data.userId;
	
	// Static IDs from chat/+page.svelte
	// const CONVERSATION_ID = '98b6495b-01fe-445f-804e-c20e1d3ba2d0';
	const USER_ID = '74f22a5f-8ed2-45ce-af2e-ac4c32d824f4';
	const REFERENCE_MESSAGE_ID = '123e4567-e89b-12d3-a456-426655440000';
	
	// Initialize conversations from page data and sort by CreatedAt
	let conversations = $state<Conversation[]>(
		(data.conversations || []).sort((a: any, b: any) => {
			// Handle both camelCase and PascalCase, prioritize CreatedAt
			const dateA = new Date(a.CreatedAt || a.createdAt || 0).getTime();
			const dateB = new Date(b.CreatedAt || b.createdAt || 0).getTime();
			return dateB - dateA; // Most recent first
		})
	);
	
	// Log conversations on initial load and auto-select the latest conversation
	let conversationsInitialized = $state(false);
	$effect(() => {
		if (!conversationsInitialized && conversations.length > 0) {
			console.log('Initial conversations loaded:', conversations.length, conversations);
			console.log('Data conversations:', data.conversations?.length || 0);
			
			// Auto-select the latest conversation (first in the sorted array)
			const latestConversation = conversations[0];
			if (latestConversation && latestConversation.id) {
				console.log('Auto-selecting latest conversation:', latestConversation.id);
				selectConversation(latestConversation.id);
			}
			
			conversationsInitialized = true;
		}
	});
	let selectedConversationId = $state();
	let messages = $state<Message[]>([]);
	let newMessageText = $state('');
	let chatContainer = $state<HTMLElement | null>(null);
	let inputElement = $state<HTMLTextAreaElement | null>(null);
	let isLoading = $state(false);
	let sidebarOpen = $state(true);
	let inputFocused = $state(false);
	let loadingConversations = $state(false);
	let showDeleteConfirm = $state(false);
	let conversationToDelete = $state<string | null>(null);
	let deletingConversation = $state(false);

	// Store parsed content for each message to enable editing
	let parsedMessageContent = $state(new Map<number | string, any[]>());

	// Store selection state for table rows
	let selectionState = $state(
		new Map<number | string, Map<number, { type: string; selected: Set<number> }>>()
	);

	// Local storage key
	const STORAGE_KEY = `dexterous_conversations_${userId}`;

	// Save selected table rows to local storage
	function saveSelectedRowsToStorage() {
		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		try {
			// Get all selected items from all tables
			const newSelectedItems: SelectedItem[] = [];

			// Collect all selected table rows from all messages
			selectionState.forEach((messageSelections, messageId) => {
				messageSelections.forEach((state, blockIndex) => {
					if (state.type === 'table-rows' && state.selected.size > 0) {
						const parsed = parsedMessageContent.get(messageId);
						if (parsed && parsed[blockIndex]?.type === 'table') {
							const table = parsed[blockIndex];
							const selectedRows = Array.from(state.selected).map((rowIdx) => ({
								headers: table.content.headers,
								row: table.content.rows[rowIdx],
								rowIndex: rowIdx
							}));

							newSelectedItems.push({
								messageId: String(messageId),
								blockIndex,
								tableHeaders: table.content.headers,
								selectedRows
							});
						}
					}
				});
			});

			if (newSelectedItems.length === 0) {
				alert('No rows selected. Please select table rows first.');
				return;
			}

			// Save to local storage using utility function
			addSelectedItems(STORAGE_KEY, selectedConversationId as string, newSelectedItems);

			// Count total rows stored
			const totalRows = newSelectedItems.reduce(
				(sum: number, item) => sum + (item.selectedRows?.length || 0),
				0
			);

			alert(
				`Successfully stored ${totalRows} row(s) from ${newSelectedItems.length} table(s) to local storage!`
			);

			// Clear selections after storing
			selectionState.forEach((messageSelections) => {
				messageSelections.forEach((state) => {
					if (state.type === 'table-rows') {
						state.selected.clear();
					}
				});
			});
			// Trigger reactivity
			selectionState = new Map(selectionState);
		} catch (error) {
			console.error('Error saving to local storage:', error);
			alert('Error saving to local storage. Please try again.');
		}
	}

	// Selection management functions for table rows
	function getSelectionState(messageId: number | string, blockIndex: number, itemType: string) {
		if (!selectionState.has(messageId)) {
			selectionState.set(messageId, new Map());
		}
		const messageSelections = selectionState.get(messageId)!;
		if (!messageSelections.has(blockIndex)) {
			messageSelections.set(blockIndex, { type: itemType, selected: new Set<number>() });
		}
		const state = messageSelections.get(blockIndex)!;
		if (state.type !== itemType) {
			state.type = itemType;
			state.selected.clear();
		}
		return state;
	}

	function toggleSelection(
		messageId: number | string,
		blockIndex: number,
		itemIndex: number,
		itemType: string
	) {
		const state = getSelectionState(messageId, blockIndex, itemType);
		if (state.selected.has(itemIndex)) {
			state.selected.delete(itemIndex);
		} else {
			state.selected.add(itemIndex);
		}
		// Trigger reactivity by reassigning
		selectionState = new Map(selectionState);
	}

	function isSelected(
		messageId: number | string,
		blockIndex: number,
		itemIndex: number,
		itemType?: string
	): boolean {
		const state = selectionState.get(messageId)?.get(blockIndex);
		if (!state) return false;
		if (itemType && state.type !== itemType) return false;
		return state.selected.has(itemIndex) ?? false;
	}

	function toggleSelectAll(
		messageId: number | string,
		blockIndex: number,
		totalItems: number,
		itemType: string
	) {
		const state = getSelectionState(messageId, blockIndex, itemType);
		const allSelected = state.selected.size === totalItems && totalItems > 0;
		if (allSelected) {
			state.selected.clear();
		} else {
			state.selected = new Set(Array.from({ length: totalItems }, (_, i) => i));
		}
		selectionState = new Map(selectionState);
	}

	function getSelectedCount(
		messageId: number | string,
		blockIndex: number,
		itemType?: string
	): number {
		const state = selectionState.get(messageId)?.get(blockIndex);
		if (!state) return 0;
		if (itemType && state.type !== itemType) return 0;
		return state.selected.size ?? 0;
	}

	// Update message content after editing
	function updateMessageContent(messageId: number | string) {
		const parsed = parsedMessageContent.get(messageId);
		if (parsed) {
			const newContent = reconstructMarkdown(parsed);
			messages = messages.map((msg) =>
				msg.id === messageId ? { ...msg, Content: newContent } : msg
			);
			// Update the parsed content map with the modified parsed blocks
			parsedMessageContent.set(messageId, [...parsed]);
		}
	}

	// Delete table row
	function deleteTableRow(messageId: number | string, blockIndex: number, rowIndex: number) {
		const parsed = parsedMessageContent.get(messageId);
		if (parsed && parsed[blockIndex]?.type === 'table') {
			const newParsed = deleteTableRowFromBlocks(parsed, blockIndex, rowIndex);
			parsedMessageContent.set(messageId, newParsed);
			updateMessageContent(messageId);
		}
	}

	// Delete list item
	function deleteListItem(messageId: number | string, blockIndex: number, itemIndex: number) {
		const parsed = parsedMessageContent.get(messageId);
		if (
			parsed &&
			(parsed[blockIndex]?.type === 'list' || parsed[blockIndex]?.type === 'checklist')
		) {
			const newParsed = deleteListItemFromBlocks(parsed, blockIndex, itemIndex);
			parsedMessageContent.set(messageId, newParsed);
			updateMessageContent(messageId);
		}
	}

	// Handle button actions from markdown buttons
	async function handleButtonAction(button: any, messageId: number | string) {
		console.log('Button clicked:', button);
		
		try {
			if (button.action === 'confirm') {
				// Save the assistant message to local storage when user confirms
				if (selectedConversationId) {
					let conversationData = getConversationData(STORAGE_KEY, selectedConversationId as string);
					if (!conversationData) {
						conversationData = {
							conversationId: selectedConversationId as string,
							userId: userId,
							referenceMessageId: REFERENCE_MESSAGE_ID,
							timestamp: new Date().toISOString(),
							messages: [],
							selectedItems: []
						};
					}
					
					// Find the assistant message by messageId
					const assistantMessage = messages.find(msg => msg.id === messageId);
					if (assistantMessage && assistantMessage.Role === 'Assistant') {
						if (!conversationData.messages) {
							conversationData.messages = [];
						}
						
						// Check if message already exists to avoid duplicates
						const messageExists = conversationData.messages.some((msg: Message) => msg.id === messageId);
						if (!messageExists) {
							conversationData.messages = [...conversationData.messages, assistantMessage];
							conversationData.referenceMessageId = REFERENCE_MESSAGE_ID;
							saveConversationData(STORAGE_KEY, selectedConversationId as string, conversationData);
							console.log('Assistant message saved to local storage after user confirmation');
						}
					}
				}
				
				// Handle confirm action
				if (button.operation === 'save' && button.payload) {
					try {
						const payload = JSON.parse(button.payload);
						console.log('Saving with payload:', payload);
						
						// You can add API call here to save the data
						// For now, just show a success message
						// alert(`Saving ${payload.count || 'items'} to database...`);
						
						// Example API call (uncomment and modify as needed):
						// const response = await fetch('/api/server/save-services', {
						// 	method: 'POST',
						// 	headers: { 'Content-Type': 'application/json' },
						// 	body: JSON.stringify(payload)
						// });
						
					} catch (error) {
						console.error('Error parsing payload:', error);
						alert('Error processing request');
					}
				} else {
					alert('Confirm action triggered');
				}
			} else if (button.action === 'modify') {
				// Handle modify action
				alert('Modify functionality - coming soon!');
			} else if (button.action === 'cancel') {
				// Handle cancel action
				console.log('Action cancelled');
			} else {
				console.log('Unknown button action:', button.action);
			}
		} catch (error) {
			console.error('Error handling button action:', error);
			alert('Error processing button action');
		}
	}

	// Format date for display
	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'Unknown';
		
		const date = new Date(dateString);
		
		// Check if date is valid
		if (isNaN(date.getTime())) {
			return 'Invalid date';
		}
		
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		// Show relative time for recent dates
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
		
		// For older dates, show formatted date with time
		const options: Intl.DateTimeFormatOptions = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		};
		return date.toLocaleDateString('en-US', options);
	}

	// Convert backend message format to UI Message format
	function convertBackendMessageToUIMessage(backendMsg: any): Message[] {
		const uiMessages: Message[] = [];
		
		console.log('Converting backend message:', backendMsg);
		
		// Extract user content
		if (backendMsg.UserContent && Array.isArray(backendMsg.UserContent) && backendMsg.UserContent.length > 0) {
			const userText = backendMsg.UserContent
				.filter((content: any) => content.type === 'text' && content.data?.text)
				.map((content: any) => content.data.text)
				.join('\n');
			
			if (userText.trim()) {
				uiMessages.push({
					id: `${backendMsg.id}-user`,
					Content: userText,
					Role: 'User'
				});
				console.log('Added user message:', userText.substring(0, 50));
			}
		}
		
		// Extract assistant content
		if (backendMsg.AssistantContent && Array.isArray(backendMsg.AssistantContent) && backendMsg.AssistantContent.length > 0) {
			const assistantText = backendMsg.AssistantContent
				.filter((content: any) => content.type === 'text' && content.data?.text)
				.map((content: any) => content.data.text)
				.join('\n');
			
			if (assistantText.trim()) {
				uiMessages.push({
					id: `${backendMsg.id}-assistant`,
					Content: assistantText,
					Role: 'Assistant'
				});
				console.log('Added assistant message:', assistantText.substring(0, 50));
			}
		}
		
		// Fallback: if message already has Content and Role (old format or already converted)
		// if (uiMessages.length === 0 && backendMsg.Content) {
		// 	const content = typeof backendMsg.Content === 'string' 
		// 		? backendMsg.Content 
		// 		: JSON.stringify(backendMsg.Content);
		// 	const role = backendMsg.Role === 'user' || backendMsg.Role === 'User' 
		// 		? 'User' 
		// 		: backendMsg.Role === 'assistant' || backendMsg.Role === 'Assistant'
		// 		? 'Assistant'
		// 		: 'User';
			
		// 	uiMessages.push({
		// 		id: backendMsg.id || Date.now(),
		// 		Content: content,
		// 		Role: role
		// 	});
		// 	console.log('Added fallback message with Content field');
		// }
		
		return uiMessages;
	}

	// Select a conversation and load its messages
	async function selectConversation(conversationId: string) {
		console.log('Selecting conversation:', conversationId);
		selectedConversationId = conversationId;
		messages = [];
		parsedMessageContent.clear();
		selectionState.clear();

		try {
			// Load messages from API via server endpoint
			const response = await fetch(`/api/server/conversations/${conversationId}/messages`);
			console.log('Fetching messages for conversation:', conversationId);
			
			if (response.ok) {
				const result = await response.json();
				console.log('Messages API response (full):', JSON.stringify(result, null, 2));
				
				// Handle different response structures
				let apiMessages: any[] = [];
				
			
				if (result.Data && Array.isArray(result.Data)) {
					apiMessages = result.Data;
					console.log('Found messages in result.Data:', apiMessages.length);
				} 

				// // Check for messages array
				// else if (result.messages && Array.isArray(result.messages)) {
				// 	apiMessages = result.messages;
				// 	console.log('Found messages in result.messages:', apiMessages.length);
				// }
				// // Check if result itself is an array
				// else if (Array.isArray(result)) {
				// 	apiMessages = result;
				// 	console.log('Result is an array:', apiMessages.length);
				// }
				
				console.log('Extracted apiMessages:', apiMessages.length, apiMessages);
				
				if (Array.isArray(apiMessages) && apiMessages.length > 0) {
					// Convert backend message format to UI message format
					const convertedMessages: Message[] = [];
					apiMessages.forEach((backendMsg: any, index: number) => {
						console.log(`Processing backend message ${index}:`, backendMsg);
						const uiMsgs = convertBackendMessageToUIMessage(backendMsg);
						console.log(`Converted to ${uiMsgs.length} UI messages:`, uiMsgs);
						convertedMessages.push(...uiMsgs);
					});
					
					messages = convertedMessages;
					console.log('Final converted messages:', messages.length, messages);

					// Parse markdown for all loaded messages
					messages.forEach((msg) => {
						if (msg.Role === 'Assistant' && msg.Content) {
							parsedMessageContent.set(msg.id, parseMarkdown(msg.Content));
						}
					});

					// Save messages to local storage
					// const conversationData = getConversationData(STORAGE_KEY, conversationId) || {
					// 	conversationId,
					// 	userId: userId,
					// 	referenceMessageId: REFERENCE_MESSAGE_ID,
					// 	timestamp: new Date().toISOString(),
					// 	messages: [],
					// 	selectedItems: []
					// };
					// conversationData.messages = messages;
					// saveConversationData(STORAGE_KEY, conversationId, conversationData);
					
					// // Scroll to bottom after messages are loaded
					// await new Promise(resolve => setTimeout(resolve, 100));
					// scrollToBottom();
				} else {
					console.warn('No messages found in API response, trying local storage');
					// Try loading from local storage if API returns empty
					// const storedData = loadFromLocalStorage(STORAGE_KEY);
					// if (storedData && storedData[conversationId] && storedData[conversationId].messages) {
					// 	const storedMessages = storedData[conversationId].messages;
					// 	if (Array.isArray(storedMessages) && storedMessages.length > 0) {
					// 		messages = storedMessages;
					// 		console.log('Loaded messages from local storage:', messages.length);
							
					// 		// Parse markdown for all loaded messages
					// 		messages.forEach((msg) => {
					// 			if (msg.Role === 'Assistant' && msg.Content) {
					// 				parsedMessageContent.set(msg.id, parseMarkdown(msg.Content));
					// 			}
					// 		});
					// 	}
					// }
				}
			} else {
				const errorText = await response.text();
				console.error('Failed to fetch messages:', response.status, errorText);
				// Try loading from local storage if API returns error
				// const storedData = loadFromLocalStorage(STORAGE_KEY);
				// if (storedData && storedData[conversationId] && storedData[conversationId].messages) {
				// 	const storedMessages = storedData[conversationId].messages;
				// 	if (Array.isArray(storedMessages) && storedMessages.length > 0) {
				// 		messages = storedMessages;
				// 		console.log('Loaded messages from local storage (fallback):', messages.length);
						
				// 		// Parse markdown for all loaded messages
				// 		messages.forEach((msg) => {
				// 			if (msg.Role === 'Assistant' && msg.Content) {
				// 				parsedMessageContent.set(msg.id, parseMarkdown(msg.Content));
				// 			}
				// 		});
				// 	}
				// }
			}

			// Scroll to bottom after messages are loaded and rendered
			await new Promise(resolve => setTimeout(resolve, 100));
			// scrollToBottom();
		} catch (error) {
			console.error('Error loading conversation messages:', error);
			// Fallback to local storage
			// const storedData = loadFromLocalStorage(STORAGE_KEY);
			// if (storedData && storedData[conversationId] && storedData[conversationId].messages) {
			// 	const storedMessages = storedData[conversationId].messages;
			// 	if (Array.isArray(storedMessages) && storedMessages.length > 0) {
			// 		messages = storedMessages;
			// 		console.log('Loaded messages from local storage (fallback):', messages.length);
					
			// 		// Parse markdown for all loaded messages
			// 		messages.forEach((msg) => {
			// 			if (msg.Role === 'Assistant' && msg.Content) {
			// 				parsedMessageContent.set(msg.id, parseMarkdown(msg.Content));
			// 			}
			// 		});
					
			// 		// Scroll to bottom after messages are loaded
			// 		await new Promise(resolve => setTimeout(resolve, 100));
			// 		scrollToBottom();
			// 	}
			// }
		}
	}



	// Get parsed content for a message (caches parsed markdown)
	function getParsedContent(messageId: number | string, content: string): any[] {
		if (!parsedMessageContent.has(messageId)) {
			parsedMessageContent.set(messageId, parseMarkdown(content));
		}
		return parsedMessageContent.get(messageId)!;
	}

	const scrollToBottom = () => {
		if (chatContainer) {
			const el = chatContainer;
			// Use requestAnimationFrame to ensure DOM is updated
			requestAnimationFrame(() => {
				setTimeout(() => {
					el.scrollTo({
						top: el.scrollHeight,
						behavior: 'smooth'
					});
				}, 50);
			});
		}
	};

	const sendMessage = async () => {
		const trimmedMessage = newMessageText.trim();
		if (trimmedMessage === '' || isLoading) return;

		// Create new conversation if none selected
		if (!selectedConversationId) {
			// Create a new conversation first
			try {
				const response = await fetch('/api/server/conversations', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						ProjectId: '8ad453ce-2fe8-4beb-91ce-0c55504edcc8',
						userId: userId
					})
				});

				if (response.ok) {
					const result = await response.json();
					// Extract conversation ID from response
					const newConversationId = result.Data?.id || result.data?.id || result.id || result.conversationId;
					
					if (newConversationId) {
						selectedConversationId = newConversationId;
						// Initialize conversation data
						// const conversationData = {
						// 	conversationId: newConversationId,
						// 	userId: userId,
						// 	referenceMessageId: REFERENCE_MESSAGE_ID,
						// 	timestamp: new Date().toISOString(),
						// 	messages: [],
						// 	selectedItems: []
						// };
						// saveConversationData(STORAGE_KEY, newConversationId, conversationData);
						
						// Add to conversations list
						const newConversation = {
							id: newConversationId,
							ProjectId: '8ad453ce-2fe8-4beb-91ce-0c55504edcc8',
							UserId: userId,
							Status: 'active',
							Context: {},
							CreatedAt: new Date().toISOString(),
							UpdatedAt: new Date().toISOString()
						};
						conversations = [newConversation, ...conversations].sort((a: any, b: any) => {
							const dateA = new Date(a.CreatedAt || a.createdAt || 0).getTime();
							const dateB = new Date(b.CreatedAt || b.createdAt || 0).getTime();
							return dateB - dateA;
						});
					} else {
						console.error('Failed to create conversation: No ID in response');
						return;
					}
				} else {
					console.error('Failed to create conversation:', response.statusText);
					return;
				}
			} catch (error) {
				console.error('Error creating conversation:', error);
				return;
			}
		}

		const userMessage: Message = {
			id: Date.now(),
			Content: trimmedMessage,
			Role: 'User'
		};
		messages = [...messages, userMessage];
		newMessageText = '';
		isLoading = true;
		scrollToBottom();

		// Get or create conversation metadata from localStorage
		let conversationData = getConversationData(STORAGE_KEY, selectedConversationId as string);
		if (!conversationData) {
			// Create new conversation data using the selected conversation ID
			conversationData = {
				conversationId: selectedConversationId as string, // Use the currently selected conversation ID
				userId: USER_ID,
				referenceMessageId: REFERENCE_MESSAGE_ID,
				timestamp: new Date().toISOString(),
				messages: [],
				selectedItems: []
			};
		} else {
			// Ensure conversationId is set to the selected one
			conversationData.conversationId = selectedConversationId as string;
		}
		
		// Save user message to local storage (commented as requested)
		// if (!conversationData.messages) {
		// 	conversationData.messages = [];
		// }
		// conversationData.messages = [...conversationData.messages, userMessage];
		// saveConversationData(STORAGE_KEY, selectedConversationId, conversationData);

		// Use the currently selected conversation ID dynamically
		const CURRENT_CONVERSATION_ID = selectedConversationId; // Use the selected conversation ID directly
		const CURRENT_USER_ID = USER_ID;
		const CURRENT_REFERENCE_MESSAGE_ID = REFERENCE_MESSAGE_ID;

		try {
			const response = await fetch('/api/server/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: CURRENT_CONVERSATION_ID, // This will be the currently selected conversation ID
					message: trimmedMessage,
					userId: CURRENT_USER_ID,
					referenceMessageId: CURRENT_REFERENCE_MESSAGE_ID
				})
			});

			if (response.ok) {
				const result = await response.json();
				console.log('Chat API response:', result);
				
				// Handle new response format with AssistantContent array
				let assistantContent = '';
				
				// Check for new format (AssistantContent array)
				if (result.Data && Array.isArray(result.Data) && result.Data.length > 0) {
					const latestMessage = result.Data[result.Data.length - 1];
					if (latestMessage.AssistantContent && Array.isArray(latestMessage.AssistantContent)) {
						assistantContent = latestMessage.AssistantContent
							.filter((content: any) => content.type === 'text' && content.data?.text)
							.map((content: any) => content.data.text)
							.join('\n');
					}
				} else if (result.Data?.AssistantContent && Array.isArray(result.Data.AssistantContent)) {
					assistantContent = result.Data.AssistantContent
						.filter((content: any) => content.type === 'text' && content.data?.text)
						.map((content: any) => content.data.text)
						.join('\n');
				} else {
					// Fallback to old format
					assistantContent = result?.Content || result?.content || result?.message || result?.Message || result?.Data?.Content || '';
				}
				
				if (assistantContent) {
					const assistantMessage: Message = {
						id: Date.now() + 1,
						Content: assistantContent,
						Role: 'Assistant'
					};
					messages = [...messages, assistantMessage];
					
					// Parse markdown for assistant message
					parsedMessageContent.set(assistantMessage.id, parseMarkdown(assistantContent));
					
					// Don't save assistant message to local storage automatically
					// It will be saved only when user confirms via button action
					
					scrollToBottom();
				} else {
					console.warn('No assistant content found in response:', result);
				}
			} else {
				console.error('Failed to send message:', response.statusText);
				const errorMessage: Message = {
					id: Date.now() + 1,
					Content: 'Sorry, I encountered an error. Please try again.',
					Role: 'Assistant'
				};
				messages = [...messages, errorMessage];
				
				// Save error message to local storage
				let conversationData = getConversationData(STORAGE_KEY, selectedConversationId as string);
				if (conversationData) {
					if (!conversationData.messages) {
						conversationData.messages = [];
					}
					conversationData.messages = [...conversationData.messages, errorMessage];
					saveConversationData(STORAGE_KEY, selectedConversationId as string, conversationData);
				}
			}
		} catch (error) {
			console.error('Error sending message:', error);
			const errorMessage: Message = {
				id: Date.now() + 1,
				Content: 'Sorry, I encountered an error. Please try again.',
				Role: 'Assistant'
			};
			messages = [...messages, errorMessage];
			
			// Save error message to local storage
			// let conversationData = getConversationData(STORAGE_KEY, selectedConversationId);
			// if (conversationData) {
			// 	if (!conversationData.messages) {
			// 		conversationData.messages = [];
			// 	}
			// 	conversationData.messages = [...conversationData.messages, errorMessage];
			// 	saveConversationData(STORAGE_KEY, selectedConversationId, conversationData);
			// }
		} finally {
			isLoading = false;
		}
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	};

	const adjustTextareaHeight = () => {
		if (inputElement) {
			inputElement.style.height = 'auto';
			const newHeight = Math.min(inputElement.scrollHeight, 200);
			inputElement.style.height = `${newHeight}px`;
		}
	};

	$effect(() => {
		if (newMessageText !== undefined) {
			adjustTextareaHeight();
		}
	});

	// Auto-scroll to bottom when messages change (e.g., when selecting a conversation)
	$effect(() => {
		if (messages.length > 0) {
			// Wait for DOM to update, then scroll
			setTimeout(() => {
				scrollToBottom();
			}, 150);
		}
	});

	// Delete conversation
	const deleteConversation = async (conversationId: string) => {
		conversationToDelete = conversationId;
		showDeleteConfirm = true;
	};

	const confirmDeleteConversation = async () => {
		if (!conversationToDelete || deletingConversation) return;

		deletingConversation = true;
		try {
			const response = await fetch(`/api/server/conversations/${conversationToDelete}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				// Remove conversation from list
				conversations = conversations.filter((conv) => conv.id !== conversationToDelete);
				
				// If deleted conversation was selected, clear selection
				if (selectedConversationId === conversationToDelete) {
					selectedConversationId = null;
					messages = [];
					parsedMessageContent.clear();
					selectionState.clear();
				}

				// Remove from local storage
				const storedData = loadFromLocalStorage(STORAGE_KEY);
				if (storedData && storedData[conversationToDelete]) {
					delete storedData[conversationToDelete];
					saveToLocalStorage(STORAGE_KEY, storedData);
				}

				console.log('Conversation deleted successfully:', conversationToDelete);
			} else {
				const errorData = await response.json();
				console.error('Failed to delete conversation:', errorData);
				alert('Failed to delete conversation. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting conversation:', error);
			alert('Error deleting conversation. Please try again.');
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

	const newChat = async () => {
		try {
			// Create new conversation via API
			const response = await fetch('/api/server/conversations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					ProjectId: '23fa2c4f-3462-4892-81c8-273e73d35e86',
					userId: userId // Use userId from page params
				})
			});

			const result = await response.json();
			console.log('New conversation API response:', result);
			if (response.ok) {
				
				// Extract conversation ID from response - handle different response structures
				let newConversationId: string | null = null;
				let newConversation: any = null;
				
				// Check for conversation object in response
				if (result.Data && result.Data.id) {
					newConversationId = result.Data.id;
					newConversation = result.Data;
				// } else if (result.data && result.data.id) {
				// 	newConversationId = result.data.id;
				// 	newConversation = result.data;
				// } else if (result.id) {
				// 	newConversationId = result.id;
				// 	newConversation = result;
				// } else if (result.conversationId) {
				// 	newConversationId = result.conversationId;
				// 	newConversation = result;
				}
				
				if (newConversationId) {
					// Set the new conversation as selected
					selectedConversationId = newConversationId;
					messages = [];
					newMessageText = '';
					parsedMessageContent.clear();
					selectionState.clear();
					
					// Initialize conversation data in local storage
					// const conversationData = {
					// 	conversationId: newConversationId,
					// 	userId: userId,
					// 	referenceMessageId: REFERENCE_MESSAGE_ID,
					// 	timestamp: new Date().toISOString(),
					// 	messages: [],
					// 	selectedItems: []
					// };
					// saveConversationData(STORAGE_KEY, newConversationId, conversationData);
					
					// Add new conversation to the sidebar
					// Use the conversation object from API if available, otherwise create one
					if (newConversation) {
						// Ensure it has the required fields
						const conversationToAdd = {
							id: newConversationId,
							ProjectId: newConversation.ProjectId || '8ad453ce-2fe8-4beb-91ce-0c55504edcc8',
							UserId: newConversation.UserId || userId,
							Status: newConversation.Status || 'active',
							Context: newConversation.Context || {},
							CreatedAt: newConversation.CreatedAt || new Date().toISOString(),
							UpdatedAt: newConversation.UpdatedAt || new Date().toISOString()
						};
						// Add to the beginning of the list and sort by CreatedAt
						conversations = [conversationToAdd, ...conversations].sort((a: any, b: any) => {
							const dateA = new Date(a.CreatedAt || a.createdAt || 0).getTime();
							const dateB = new Date(b.CreatedAt || b.createdAt || 0).getTime();
							return dateB - dateA; // Most recent first
						});
					// } else {
					// 	// Fallback: create conversation object manually
					// 	const conversationToAdd = {
					// 		id: newConversationId,
					// 		ProjectId: '8ad453ce-2fe8-4beb-91ce-0c55504edcc8',
					// 		UserId: userId,
					// 		Status: 'active',
					// 		Context: {},
					// 		CreatedAt: new Date().toISOString(),
					// 		UpdatedAt: new Date().toISOString()
					// 	};
					// 	conversations = [conversationToAdd, ...conversations].sort((a: any, b: any) => {
					// 		const dateA = new Date(a.CreatedAt || a.createdAt || 0).getTime();
					// 		const dateB = new Date(b.CreatedAt || b.createdAt || 0).getTime();
					// 		return dateB - dateA; // Most recent first
					// 	});
					}
					
					console.log('New conversation created and added to sidebar:', newConversationId);
				} else {
					console.error('No conversation ID in response:', result);
					alert('Failed to create conversation: No ID returned from server');
				}
			} else {
				const errorText = await response.text();
				console.error('Failed to create conversation:', response.status, errorText);
				alert(`Failed to create conversation: ${response.statusText}`);
			}
		} catch (error) {
			console.error('Error creating new conversation:', error);
			alert('Error creating new conversation. Please try again.');
		}

		if (inputElement) {
			inputElement.style.height = 'auto';
			setTimeout(() => {
				if (inputElement) {
					inputElement.style.height = '60px';
				}
			}, 0);
		}
	};

	let conversationsLoaded = $state(false);
	$effect(() => {
		setTimeout(() => {
			if (inputElement) {
				inputElement.style.height = '60px';
			}
		}, 0);
		// Load conversations on mount only once if not already loaded
		if (!conversationsLoaded && conversations.length === 0 && (!data.conversations || data.conversations.length === 0)) {
			conversationsLoaded = true;
			// loadingConversations();
		}
	});
</script>

<div
	class="flex h-screen overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#0f0f23] font-sans text-white antialiased"
	style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"
>
	<!-- Sidebar -->
	<aside
		class="relative z-10 flex h-screen flex-col overflow-hidden border-r border-white/10 bg-[rgba(20,20,35,0.8)] backdrop-blur-xl transition-all duration-300 ease-out"
		style="width: {sidebarOpen ? '280px' : '0'};"
	>
		<div class="border-b border-white/10 px-5 py-6">
			<div class="flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_16px_rgba(255,107,53,0.3)]"
				>
					<Icon icon="mdi:layers" width="24" height="24" />
				</div>
				<span class="text-lg font-bold tracking-tight text-white" style="letter-spacing: -0.02em;"
					>Dexterous AI</span
				>
			</div>
		</div>

		<div class="flex-1 overflow-x-hidden overflow-y-auto px-5 py-5">
			<button
				onclick={newChat}
				class="mb-8 flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.35)] active:translate-y-0"
				style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
			>
				<Icon icon="mdi:plus" width="18" height="18" />
				<span>New Conversation</span>
			</button>

			<div class="mb-8">
				<h3
					class="m-0 mb-4 text-xs font-semibold text-white/50 uppercase"
					style="letter-spacing: 0.1em;"
				>
					Recent Conversations
				</h3>
				{#if loadingConversations}
					<div class="text-sm text-white/40">Loading...</div>
				{:else if conversations.length === 0}
					<div class="text-sm text-white/40">No conversations yet</div>
				{:else}
					<div class="flex flex-col gap-2">
						{#each conversations as conversation (conversation.id)}
							<div
								class="group relative flex w-full items-center gap-2 rounded-[10px] transition-all duration-200 hover:bg-white/8 {selectedConversationId ===
								conversation.id
									? 'bg-white/10'
									: ''}"
							>
								<button
									onclick={() => selectConversation(conversation.id)}
									class="flex flex-1 cursor-pointer items-center gap-3 px-3 py-3 text-left"
								>
									<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl">
										💬
									</div>
									<div class="min-w-0 flex-1">
										<div
											class="mb-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-white/90 font-mono"
											title={conversation.id}
										>
											{conversation.id}
										</div>
										<div class="text-xs text-white/40">
											{formatDate((conversation as any).createdAt || (conversation as any).CreatedAt)}
										</div>
									</div>
								</button>
								<button
									onclick={(e) => {
										e.stopPropagation();
										deleteConversation(conversation.id);
									}}
									class="absolute right-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 rounded-lg bg-red-500/20 p-1.5 hover:bg-red-500/30 text-red-400"
									title="Delete conversation"
								>
									<Icon icon="mdi:delete-outline" width="18" height="18" />
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		<div class="border-t border-white/10 px-5 py-5">
			<div
				class="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-white/5"
			>
				<div
					class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-base font-semibold text-white shadow-[0_2px_8px_rgba(255,107,53,0.3)]"
				>
					<span>{userId.charAt(0).toUpperCase()}</span>
				</div>
				<div class="min-w-0 flex-1">
					<div
						class="mb-0.5 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap text-white"
					>
						User {userId.substring(0, 8)}
					</div>
					<div class="text-xs text-white/50">User ID</div>
				</div>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="relative flex h-screen flex-1 flex-col overflow-hidden">
		{#if messages.length === 0}
			<!-- Welcome Screen -->
			<div
				class="relative flex h-full flex-col items-center justify-start px-8 pt-16 pb-1 text-center"
			>
				<div class="relative mb-12">
					<div
						class="relative z-10 animate-bounce text-[5rem] drop-shadow-[0_10px_30px_rgba(255,107,53,0.3)]"
					>
						✨
					</div>
					<div
						class="bg-gradient-radial absolute top-1/2 left-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full from-[rgba(255,107,53,0.2)] to-transparent"
					></div>
				</div>
				<div class="mb-12 max-w-[600px]">
					<h1
						class="m-0 mb-4 bg-gradient-to-br from-white to-white/70 bg-clip-text text-5xl font-extrabold text-transparent text-white"
						style="letter-spacing: -0.03em;"
					>
						Welcome to Dexterous AI
					</h1>
					<p class="m-0 text-xl leading-relaxed font-normal text-white/60">
						Select a conversation from the sidebar or start a new one to begin chatting.
					</p>
				</div>
			</div>
		{:else}
			<!-- Chat Messages -->
			<div
				bind:this={chatContainer}
				class="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth px-8 py-8 pb-40"
			>
				{#each messages as message (message.id)}
					<div
						class="mb-6 flex animate-[fadeInUp_0.4s_ease-out] items-start gap-3 {message.Role ===
						'User'
							? 'justify-end'
							: ''}"
					>
						{#if message.Role === 'Assistant'}
							<div
								class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]"
							>
								<Icon icon="mdi:layers" width="20" height="20" />
							</div>
						{/if}
						<div
							class="relative max-w-[75%] rounded-[18px] px-4 py-4 [overflow-wrap:anywhere] break-words backdrop-blur-md {message.Role ===
							'User'
								? 'rounded-br-sm bg-gradient-to-br from-[#ff6b35] to-[#f7931e] shadow-[0_4px_16px_rgba(255,107,53,0.3)]'
								: 'rounded-bl-sm border border-white/10 bg-white/8 shadow-[0_2px_8px_rgba(0,0,0,0.15)]'}"
						>
							{#if message.Role === 'Assistant'}
								{@const parsedContent = getParsedContent(message.id, message.Content)}
								<div class="mb-2 text-[0.95rem] leading-[1.7] text-white">
									{#each parsedContent as block, blockIndex}
										{#if block.type === 'h1'}
											<h1
												class="mt-4 mb-3 border-b-2 border-[#ff6b35] pb-2 text-2xl font-bold text-white first:mt-0"
											>
												{@html parseInlineFormatting(block.content)}
											</h1>
										{:else if block.type === 'h2'}
											<h2 class="mt-4 mb-2 text-xl font-semibold text-white first:mt-0">
												{@html parseInlineFormatting(block.content)}
											</h2>
										{:else if block.type === 'h3'}
											<h3 class="mt-3 mb-2 text-lg font-semibold text-white first:mt-0">
												{@html parseInlineFormatting(block.content)}
											</h3>
										{:else if block.type === 'hr'}
											<hr class="my-4 border-t border-white/20" />
										{:else if block.type === 'code'}
											<div class="my-4 overflow-hidden rounded-lg border border-white/20 shadow-sm">
												<div class="flex items-center justify-between bg-[#1a1a2e] px-4 py-2">
													<span class="font-mono text-sm text-white/60"
														>{block.language || 'code'}</span
													>
													<button
														class="rounded bg-white/5 px-2 py-1 text-xs text-white/40 transition-colors hover:text-white"
														onclick={() => {
															navigator.clipboard.writeText(block.content);
														}}
													>
														Copy
													</button>
												</div>
												<pre class="overflow-x-auto bg-[#0a0a1a] p-4"><code
														class="font-mono text-sm text-[#ff6b35]">{block.content}</code
													></pre>
											</div>
										{:else if block.type === 'table'}
											{@const selectedRowsCount = getSelectedCount(
												message.id,
												blockIndex,
												'table-rows'
											)}
											{@const totalRows = block.content.rows.length}
											<div
												class="group relative my-4 overflow-x-auto rounded-lg border border-white/20 shadow-sm"
											>
												{#if selectedRowsCount > 0}
													<div
														class="absolute top-2 right-2 z-10 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm"
													>
														<span class="text-xs text-white/80"
															>{selectedRowsCount} row{selectedRowsCount !== 1 ? 's' : ''} selected</span
														>
													</div>
												{/if}
												<table class="min-w-full divide-y divide-white/10">
													<thead class="bg-gradient-to-r from-[#ff6b35] to-[#f7931e]">
														<tr>
															<th class="w-12 px-3 py-3 text-center">
																<input
																	type="checkbox"
																	checked={selectedRowsCount === totalRows && totalRows > 0}
																	onchange={() =>
																		toggleSelectAll(
																			message.id,
																			blockIndex,
																			totalRows,
																			'table-rows'
																		)}
																	class="h-4 w-4 cursor-pointer rounded border-white/30 bg-white/20 text-[#ff6b35] focus:ring-2 focus:ring-white/50"
																	title="Select all rows"
																/>
															</th>
															{#each block.content.headers as header}
																<th
																	class="px-4 py-3 text-left text-sm font-semibold tracking-wider text-white"
																>
																	{@html parseInlineFormatting(header)}
																</th>
															{/each}
															<th class="w-12 px-2 py-3"></th>
														</tr>
													</thead>
													<tbody class="divide-y divide-white/10 bg-white/5">
														{#each block.content.rows as row, rowIdx}
															<tr
																class="group/row {rowIdx % 2 === 0
																	? 'bg-white/5 hover:bg-white/10'
																	: 'bg-white/3 hover:bg-white/10'} {isSelected(
																	message.id,
																	blockIndex,
																	rowIdx,
																	'table-rows'
																)
																	? 'bg-[#ff6b35]/20'
																	: ''}"
																style="transition-colors duration-150;"
															>
																<td class="px-3 py-3 text-center">
																	<input
																		type="checkbox"
																		checked={isSelected(
																			message.id,
																			blockIndex,
																			rowIdx,
																			'table-rows'
																		)}
																		onchange={() =>
																			toggleSelection(message.id, blockIndex, rowIdx, 'table-rows')}
																		class="h-4 w-4 cursor-pointer rounded border-white/30 bg-white/20 text-[#ff6b35] focus:ring-2 focus:ring-white/50"
																	/>
																</td>
																{#each row as cell}
																	<td class="px-4 py-3 text-sm text-white/90">
																		{@html parseInlineFormatting(cell)}
																	</td>
																{/each}
																<td class="px-2 py-3">
																	<button
																		class="rounded bg-white/10 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-red-500/20 hover:text-red-400"
																		onclick={() => deleteTableRow(message.id, blockIndex, rowIdx)}
																		title="Delete row"
																	>
																		<Icon icon="mdi:close" width="14" height="14" />
																	</button>
																</td>
															</tr>
														{/each}
													</tbody>
												</table>
												{#if selectedRowsCount > 0}
													<div class="mt-3 flex justify-end px-4 pb-4">
														<button
															onclick={saveSelectedRowsToStorage}
															class="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]"
															title="Save selected rows to local storage"
														>
															<Icon icon="mdi:database-plus" width="18" height="18" />
															<span>Save to Database</span>
														</button>
													</div>
												{/if}
											</div>
										{:else if block.type === 'checklist'}
											<div class="my-3 space-y-2">
												<ul class="space-y-2">
													{#each block.content as item, itemIndex}
														<li class="group/item flex items-start gap-3">
															<input
																type="checkbox"
																checked={item.checked}
																class="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]"
																disabled
															/>
															<span
																class={item.checked
																	? 'flex-1 text-white/50 line-through'
																	: 'flex-1 text-white/90'}
															>
																{@html parseInlineFormatting(item.text)}
															</span>
															<button
																class="ml-2 rounded bg-white/10 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity group-hover/item:opacity-100 hover:bg-red-500/20 hover:text-red-400"
																onclick={() => deleteListItem(message.id, blockIndex, itemIndex)}
																title="Delete item"
															>
																<Icon icon="mdi:close" width="14" height="14" />
															</button>
														</li>
													{/each}
												</ul>
											</div>
										{:else if block.type === 'list'}
											<div class="my-3 space-y-2">
												<ul class="space-y-2">
													{#each block.content as item, itemIndex}
														<li
															class="group/item flex items-start gap-3"
															style="padding-left: {item.indent * 1.5}rem"
														>
															<span class="mt-1.5 text-[#ff6b35]">●</span>
															<span class="flex-1 text-white/90"
																>{@html parseInlineFormatting(item.text)}</span
															>
															<button
																class="ml-2 rounded bg-white/10 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity group-hover/item:opacity-100 hover:bg-red-500/20 hover:text-red-400"
																onclick={() => deleteListItem(message.id, blockIndex, itemIndex)}
																title="Delete item"
															>
																<Icon icon="mdi:close" width="14" height="14" />
															</button>
														</li>
													{/each}
												</ul>
											</div>
										{:else if block.type === 'p'}
											<p class="my-2 leading-relaxed text-white/90">
												{@html parseInlineFormatting(block.content)}
											</p>
										{:else if block.type === 'buttons'}
											<div class="my-4 flex flex-wrap gap-3">
												{#each block.content as button}
													<button
														class="rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl {button.className === 'btn-primary'
															? 'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]'
															: button.className === 'btn-secondary' || button.className === 'btn-secondaryy'
															? 'border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20'
															: 'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]'}"
														onclick={() => handleButtonAction(button, message.id)}
													>
														{@html parseInlineFormatting(button.text)}
													</button>
												{/each}
											</div>
										{/if}
									{/each}
								</div>
							{:else}
								<div class="mb-2 text-[0.95rem] leading-[1.7] whitespace-pre-wrap text-white">
									{message.Content}
								</div>
							{/if}
							<div class="mt-2 text-[0.7rem] text-white/40">
								{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</div>
						</div>
						{#if message.Role === 'User'}
							<div
								class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border-2 border-white/20 bg-white/10 text-sm font-semibold text-white"
							>
								<span>{userId.charAt(0).toUpperCase()}</span>
							</div>
						{/if}
					</div>
				{/each}

				{#if isLoading}
					<div class="mb-6 flex animate-[fadeInUp_0.4s_ease-out] items-start gap-3">
						<div
							class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]"
						>
							<Icon icon="mdi:layers" width="20" height="20" />
						</div>
						<div
							class="inline-block rounded-[18px] rounded-bl-sm border border-white/10 bg-white/8 px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-md"
						>
							<div class="flex items-center gap-2">
								<span
									class="h-2 w-2 animate-[typing_1.4s_infinite_ease-in-out] rounded-full bg-white/60"
									style="animation-delay: -0.32s;"
								></span>
								<span
									class="h-2 w-2 animate-[typing_1.4s_infinite_ease-in-out] rounded-full bg-white/60"
									style="animation-delay: -0.16s;"
								></span>
								<span
									class="h-2 w-2 animate-[typing_1.4s_infinite_ease-in-out] rounded-full bg-white/60"
								></span>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Input Area -->
		<div
			class="absolute right-0 bottom-0 left-0 px-8 py-6 backdrop-blur-xl"
			style="background: linear-gradient(180deg, transparent 0%, rgba(10, 10, 26, 0.95) 20%, rgba(10, 10, 26, 0.98) 100%);"
		>
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
					style="min-height: 60px; max-height: 200px; line-height: 1.5; font-family: inherit;"
					disabled={isLoading}
					rows="1"
				></textarea>

				<button
					onclick={sendMessage}
					disabled={!newMessageText.trim() || isLoading}
					class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border-none transition-all duration-200 {newMessageText.trim() &&
					!isLoading
						? 'cursor-pointer bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)] active:translate-y-0 active:scale-100'
						: 'cursor-not-allowed bg-white/10 text-white/50'}"
					style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
					title="Send message"
				>
					<Icon icon="mdi:send" width="20" height="20" />
				</button>
			</div>
		</div>
	</main>

	<!-- Delete Confirmation Dialog -->
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
		from {
			opacity: 0;
			transform: translateY(15px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes typing {
		0%,
		80%,
		100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}

	:global(body) {
		margin: 0;
		padding: 0;
		overflow: hidden;
	}

	:global(::-webkit-scrollbar) {
		width: 8px;
	}

	:global(::-webkit-scrollbar-track) {
		background: rgba(255, 255, 255, 0.05);
	}

	:global(::-webkit-scrollbar-thumb) {
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
	}

	:global(::-webkit-scrollbar-thumb:hover) {
		background: rgba(255, 255, 255, 0.3);
	}

	:global(textarea::placeholder) {
		color: rgba(255, 255, 255, 0.4);
		opacity: 1;
	}
</style>
