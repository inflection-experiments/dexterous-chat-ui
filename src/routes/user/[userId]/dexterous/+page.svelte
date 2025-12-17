<script lang="ts">
	import type { Message } from '$lib/types/chat';
	import type { Conversation } from '$lib/types/botTypes';
	import Icon from '@iconify/svelte';
	import type { PageServerData } from './$types';
	import { parseMarkdown, reconstructMarkdown, deleteTableRowFromBlocks, deleteListItemFromBlocks } from '$lib/utils/markdownParser';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import MessageComponent from '$lib/components/Message.svelte';
	import {
		sortConversations,
		extractConversationId,
		extractAssistantContent,
		extractFirstUserMessage,
		convertBackendMessageToUIMessage,
		extractMessagesFromResponse,
		sendChatMessage,
		createConversation,
		fetchConversationMessages,
		deleteConversationAPI,
		createSelectionState
	} from '$lib/utils/ChatUtils';

	let { data }: { data: PageServerData } = $props();

	// Constants
	const USER_ID = '74f22a5f-8ed2-45ce-af2e-ac4c32d824f4';
	const REFERENCE_MESSAGE_ID = '123e4567-e89b-12d3-a456-426655440000';
	const PROJECT_ID = 'df4c6df0-594a-4dcb-8754-49eead9743f3';

	// State
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

	// Parsed content and selection management
	let parsedMessageContent = $state(new Map<number | string, any[]>());
	const selectionManager = createSelectionState();
	let selectionState = $state(selectionManager.getState());
	let conversationTitles = $state(new Map<string, string>());

	// Auto-select latest conversation on mount
	let conversationsInitialized = $state(false);
	$effect(() => {
		if (!conversationsInitialized && conversations.length > 0) {
			const latest = conversations[0];
			if (latest?.id) {
				selectConversation(latest.id);
			}
			conversationsInitialized = true;
		}
	});

	// Auto-scroll when messages change
	$effect(() => {
		if (messages.length > 0) {
			setTimeout(scrollToBottom, 150);
		}
	});

	// Adjust textarea height on input
	$effect(() => {
		if (newMessageText !== undefined) {
			adjustTextareaHeight();
		}
	});

	// Helper Functions
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

	const updateMessageContent = (messageId: number | string) => {
		const parsed = parsedMessageContent.get(messageId);
		if (parsed) {
			const newContent = reconstructMarkdown(parsed);
			messages = messages.map((msg) =>
				msg.id === messageId ? { ...msg, Content: newContent } : msg
			);
			parsedMessageContent.set(messageId, [...parsed]);
		}
	};

	// Message Operations
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

	const addAssistantMessage = (content: string) => {
		const assistantMessage: Message = {
			id: Date.now() + 1,
			Content: content,
			Role: 'Assistant'
		};
		messages = [...messages, assistantMessage];
		parsedMessageContent.set(assistantMessage.id, parseMarkdown(content));
		return assistantMessage;
	};

	const addErrorMessage = () => {
		addAssistantMessage('Sorry, I encountered an error. Please try again.');
	};

	// API Handlers
	const ensureConversation = async (): Promise<boolean> => {
		if (selectedConversationId) return true;

		try {
			const result = await createConversation(PROJECT_ID, data.userId);
			const newId = extractConversationId(result);

			if (!newId) {
				console.error('Failed to create conversation: No ID in response');
				return false;
			}

			selectedConversationId = newId;
			messages = [];
			parsedMessageContent.clear();
			selectionManager.clear();

			conversations = sortConversations([
				{
					id: newId,
					userId: data.userId,
					status: 'active',
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString()
				},
				...conversations
			]);

			return true;
		} catch (error) {
			console.error('Error creating conversation:', error);
			return false;
		}
	};

	const sendMessage = async () => {
		const trimmedMessage = newMessageText.trim();
		if (!trimmedMessage || isLoading) return;

		if (!(await ensureConversation())) return;

		addUserMessage(trimmedMessage);
		newMessageText = '';
		isLoading = true;
		scrollToBottom();

		try {
			const result = await sendChatMessage(selectedConversationId, trimmedMessage, USER_ID, REFERENCE_MESSAGE_ID);
			const content = extractAssistantContent(result);

			if (content) {
				addAssistantMessage(content);
				scrollToBottom();
			} else {
				console.warn('No assistant content found in response');
			}
		} catch (error) {
			console.error('Error sending message:', error);
			addErrorMessage();
		} finally {
			isLoading = false;
		}
	};

	const selectConversation = async (conversationId: string) => {
		selectedConversationId = conversationId;
		messages = [];
		parsedMessageContent.clear();
		selectionManager.clear();

		try {
			const result = await fetchConversationMessages(conversationId);
			const apiMessages = extractMessagesFromResponse(result);

			if (apiMessages.length > 0) {
				// Extract first user message for title
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

				// Convert backend messages to UI format
				const convertedMessages: Message[] = [];
				apiMessages.forEach((backendMsg) => {
					convertedMessages.push(...convertBackendMessageToUIMessage(backendMsg));
				});

				messages = convertedMessages;

				// Parse markdown for assistant messages
				messages.forEach((msg) => {
					if (msg.Role === 'Assistant' && msg.Content) {
						parsedMessageContent.set(msg.id, parseMarkdown(msg.Content));
					}
				});

				await new Promise((resolve) => setTimeout(resolve, 150));
				scrollToBottom();
			}
		} catch (error) {
			console.error('Error loading conversation messages:', error);
		}
	};

	const newChat = async () => {
		try {
			const result = await createConversation(PROJECT_ID, data.userId);
			const newConversationId = extractConversationId(result);

			if (!newConversationId) {
				alert('Failed to create conversation: No ID returned from server');
				return;
			}

			selectedConversationId = newConversationId;
			messages = [];
			newMessageText = '';
			parsedMessageContent.clear();
			selectionManager.clear();

			const newConv = result.Data || {};
			conversations = sortConversations([
				{
					id: newConversationId,
					userId: newConv.userId || data.userId,
					status: newConv.status || 'active',
					createdAt: newConv.createdAt || new Date().toISOString(),
					updatedAt: newConv.updatedAt || new Date().toISOString()
				},
				...conversations
			]);
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
			await deleteConversationAPI(conversationToDelete);
			conversations = conversations.filter((conv) => conv.id !== conversationToDelete);

			if (selectedConversationId === conversationToDelete) {
				selectedConversationId = '';
				messages = [];
				parsedMessageContent.clear();
				selectionManager.clear();
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

	// Event Handlers
	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	};

	// Selection & Editing Handlers
	const handleToggleSelection = (messageId: number | string, blockIndex: number, itemIndex: number, itemType: string) => {
		selectionState = selectionManager.toggle(messageId, blockIndex, itemIndex, itemType);
	};

	const handleDeleteTableRow = (messageId: number | string, blockIndex: number, rowIndex: number) => {
		const parsed = parsedMessageContent.get(messageId);
		if (parsed && parsed[blockIndex]?.type === 'table') {
			const newParsed = deleteTableRowFromBlocks(parsed, blockIndex, rowIndex);
			parsedMessageContent.set(messageId, newParsed);
			updateMessageContent(messageId);
		}
	};

	const handleDeleteListItem = (messageId: number | string, blockIndex: number, itemIndex: number) => {
		const parsed = parsedMessageContent.get(messageId);
		if (parsed && (parsed[blockIndex]?.type === 'list' || parsed[blockIndex]?.type === 'checklist')) {
			const newParsed = deleteListItemFromBlocks(parsed, blockIndex, itemIndex);
			parsedMessageContent.set(messageId, newParsed);
			updateMessageContent(messageId);
		}
	};

	const collectSelectedItems = (messageId: number | string): string => {
		const selectedItems: any[] = [];
		const messageSelections = selectionState.get(messageId);
		
		if (messageSelections) {
			messageSelections.forEach((state, blockIndex) => {
				if (state.type === 'table-rows' && state.selected.size > 0) {
					const parsed = parsedMessageContent.get(messageId);
					if (parsed && parsed[blockIndex]?.type === 'table') {
						const table = parsed[blockIndex];
						const selectedRows = Array.from(state.selected).map((rowIdx) => {
							const row = table.content.rows[rowIdx];
							const rowData: any = {};
							table.content.headers.forEach((header: string, idx: number) => {
								rowData[header] = row[idx];
							});
							return rowData;
						});
						selectedItems.push(...selectedRows);
					}
				}
			});
		}

		if (selectedItems.length === 0) return '';

		return selectedItems
			.map((item, idx) => {
				const itemDetails = Object.entries(item)
					.map(([key, value]) => `${key}: ${value}`)
					.join(', ');
				return `${idx + 1}. ${itemDetails}`;
			})
			.join('\n');
	};

	const handleButtonAction = async (button: any, messageId: number | string) => {
		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		try {
			let messageText = '';

			if (button.action === 'confirm' && button.operation === 'save') {
				const selectedItems = collectSelectedItems(messageId);
				
				if (button.payload) {
					const payload = JSON.parse(button.payload);
					const itemType = payload.itemType || 'services';
					messageText = selectedItems
						? `I want to save these ${itemType}:\n\n${selectedItems}`
						: `I want to save ${payload.count || 0} ${itemType} to the database.`;
				} else {
					messageText = selectedItems
						? `I want to save these items:\n\n${selectedItems}`
						: 'I want to save the items to the database.';
				}
			} else if (button.action === 'modify') {
				messageText = button.text || 'I want to modify the items.';
			} else if (button.action !== 'cancel' && button.action !== 'cancell') {
				messageText = button.text || `Action: ${button.action}`;
			}

			if (messageText) {
				addUserMessage(messageText);
				isLoading = true;
				scrollToBottom();

				const result = await sendChatMessage(selectedConversationId, messageText, USER_ID, REFERENCE_MESSAGE_ID);
				const content = extractAssistantContent(result);

				if (content) {
					addAssistantMessage(content);
					scrollToBottom();
				}

				isLoading = false;
			}
		} catch (error) {
			console.error('Error handling button action:', error);
			alert('Error processing button action');
			isLoading = false;
		}
	};

	const saveSelectedRowsToStorage = async () => {
		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		const selectedServices: any[] = [];
		selectionState.forEach((messageSelections, messageId) => {
			messageSelections.forEach((state, blockIndex) => {
				if (state.type === 'table-rows' && state.selected.size > 0) {
					const parsed = parsedMessageContent.get(messageId);
					if (parsed && parsed[blockIndex]?.type === 'table') {
						const table = parsed[blockIndex];
						const selectedRows = Array.from(state.selected).map((rowIdx) => {
							const row = table.content.rows[rowIdx];
							const serviceData: any = {};
							table.content.headers.forEach((header: string, idx: number) => {
								serviceData[header] = row[idx];
							});
							return serviceData;
						});
						selectedServices.push(...selectedRows);
					}
				}
			});
		});

		if (selectedServices.length === 0) {
			alert('No services selected. Please select services first.');
			return;
		}

		const serviceNames = selectedServices.map((service, idx) => {
			const name = service['Service Name'] || service['Name'] || service['#'] || `Service ${idx + 1}`;
			const description = service['Description'] || service['description'] || '';
			return description ? `${name}: ${description}` : name;
		});

		const messageText = `I want to save these services to the database:\n\n${serviceNames.join('\n')}`;

		try {
			await handleButtonAction({ action: 'confirm', operation: 'save', text: messageText }, -1);
			
			selectionState.forEach((messageSelections) => {
				messageSelections.forEach((state) => {
					if (state.type === 'table-rows') state.selected.clear();
				});
			});
			selectionState = new Map(selectionState);
		} catch (error) {
			console.error('Error saving services:', error);
			alert('Error saving services to database. Please try again.');
		}
	};
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
		{#if messages.length === 0}
			<div class="relative flex h-full flex-col items-center justify-start px-8 pt-16 pb-1 text-center">
				<div class="relative mb-12">
					<div class="bg-gradient-radial absolute top-1/2 left-1/2 h-[200px] w-[200px] -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full from-[rgba(255,107,53,0.2)] to-transparent"></div>
				</div>
				<div class="mb-12 max-w-[600px]">
					<h1 class="m-0 mb-4 bg-gradient-to-br from-white to-white/70 bg-clip-text text-5xl font-extrabold text-transparent" style="letter-spacing: -0.03em;">
						Welcome to Dexterous AI
					</h1>
					<p class="m-0 text-xl leading-relaxed font-normal text-white/60">
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
					/>
				{/each}

				{#if isLoading}
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

	:global(::-webkit-scrollbar) { width: 8px; }
	:global(::-webkit-scrollbar-track) { background: rgba(255, 255, 255, 0.05); }
	:global(::-webkit-scrollbar-thumb) { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }
	:global(::-webkit-scrollbar-thumb:hover) { background: rgba(255, 255, 255, 0.3); }
</style>