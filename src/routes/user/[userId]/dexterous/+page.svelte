<script lang="ts">
	import type { Message } from '$lib/types/chat.ts';
	import type { Conversation } from '$lib/types/botTypes';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const userId = data.userId;
	let conversations = $state<Conversation[]>(data.conversations || []);
	let selectedConversationId = $state<string | null>(null);
	let messages = $state<Message[]>([]);
	let newMessageText = $state('');
	let chatContainer = $state<HTMLElement | null>(null);
	let inputElement = $state<HTMLTextAreaElement | null>(null);
	let isLoading = $state(false);
	let sidebarOpen = $state(true);
	let inputFocused = $state(false);
	let loadingConversations = $state(false);

	// Store parsed content for each message to enable editing
	let parsedMessageContent = $state(new Map<number | string, any[]>());

	// Store selection state for each message
	let selectionState = $state(
		new Map<number | string, Map<number, { type: string; selected: Set<number> }>>()
	);

	// Local storage key
	const STORAGE_KEY = `dexterous_conversations_${userId}`;

	// Local storage functions
	function saveToLocalStorage() {
		if (!selectedConversationId) {
			alert('Please start a conversation first');
			return;
		}

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			const allStored: any = stored ? JSON.parse(stored) : {};

			// Get all selected items from all tables
			const newSelectedItems: any[] = [];

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

			// Get existing data for this conversation or create new
			const existingData = allStored[selectedConversationId] || {
				conversationId: selectedConversationId,
				userId: userId,
				timestamp: new Date().toISOString(),
				selectedItems: []
			};

			// Merge new selections with existing ones (avoid duplicates)
			const existingItemKeys = new Set(
				existingData.selectedItems.map((item: any) => `${item.messageId}-${item.blockIndex}`)
			);

			// Add only new items that don't already exist
			newSelectedItems.forEach((item) => {
				const key = `${item.messageId}-${item.blockIndex}`;
				if (!existingItemKeys.has(key)) {
					existingData.selectedItems.push(item);
				} else {
					// Update existing item with new selections
					const existingItem = existingData.selectedItems.find(
						(existing: any) => `${existing.messageId}-${existing.blockIndex}` === key
					);
					if (existingItem) {
						// Merge selected rows
						const existingRowIndices = new Set(
							existingItem.selectedRows.map((r: any) => r.rowIndex)
						);
						item.selectedRows.forEach((row: any) => {
							if (!existingRowIndices.has(row.rowIndex)) {
								existingItem.selectedRows.push(row);
							}
						});
					}
				}
			});

			// Update timestamp
			existingData.timestamp = new Date().toISOString();

			// Store by conversation ID
			allStored[selectedConversationId] = existingData;
			localStorage.setItem(STORAGE_KEY, JSON.stringify(allStored));

			// Count total rows stored
			const totalRows = existingData.selectedItems.reduce(
				(sum: number, item: any) => sum + item.selectedRows.length,
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

	function loadFromLocalStorage() {
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return null;

			return JSON.parse(stored);
		} catch (error) {
			console.error('Error loading from local storage:', error);
			return null;
		}
	}

	// Selection management functions
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

	// Format date for display
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
		return date.toLocaleDateString();
	}

	// Load conversations
	async function loadConversations() {
		loadingConversations = true;
		try {
			// Load from API
			const response = await fetch(`/api/server/conversations?userId=${userId}`);
			const result = await response.json();
			const apiConversations = result.conversations || [];

			// Load from local storage
			const storedData = loadFromLocalStorage();

			// Merge conversations (prioritize API, but include stored data)
			const conversationMap = new Map<string, Conversation>();

			// Add API conversations
			apiConversations.forEach((conv: Conversation) => {
				conversationMap.set(conv.id, conv);
			});

			// Add stored conversations that aren't in API
			if (storedData) {
				Object.keys(storedData).forEach((convId) => {
					if (!conversationMap.has(convId)) {
						// Create a conversation object from stored data
						const stored = storedData[convId];
						conversationMap.set(convId, {
							id: convId,
							userId: stored.userId || userId,
							botId: 'dexterous',
							title: `Stored Conversation (${new Date(stored.timestamp).toLocaleDateString()})`,
							createdAt: stored.timestamp,
							updatedAt: stored.timestamp,
							status: 'active'
						});
					}
				});
			}

			conversations = Array.from(conversationMap.values());
		} catch (error) {
			console.error('Error loading conversations:', error);
		} finally {
			loadingConversations = false;
		}
	}

	// Select a conversation and load its messages
	async function selectConversation(conversationId: string) {
		selectedConversationId = conversationId;
		messages = [];
		parsedMessageContent.clear();
		selectionState.clear();

		try {
			// Load messages from API
			const response = await fetch(
				`/api/server/conversations/${conversationId}/messages?userId=${userId}`
			);
			if (response.ok) {
				const result = await response.json();
				// Transform backend messages to Message format
				if (result.messages && Array.isArray(result.messages)) {
					messages = result.messages.map((msg: any) => ({
						id: msg.id || msg.Id,
						Content: msg.content || msg.Content || msg.message || msg.Message || '',
						Role: (msg.role || msg.Role || 'User') === 'user' ? 'User' : 'Assistant'
					}));
				}
			}

			// Also check local storage for stored data
			const storedData = loadFromLocalStorage();
			if (storedData && storedData[conversationId]) {
				// Stored data is available but we keep API messages as primary
				// The stored selections are available when user selects table rows
				console.log('Stored data available for conversation:', storedData[conversationId]);
			}

			scrollToBottom();
		} catch (error) {
			console.error('Error loading conversation messages:', error);
		}
	}

	// Markdown parsing functions (same as chat page)
	function parseMarkdown(md: string) {
		const lines = md.split('\n');
		const result: any[] = [];
		let i = 0;

		while (i < lines.length) {
			const line = lines[i];

			if (line.trim().startsWith('```')) {
				const language = line.trim().substring(3);
				const codeLines = [];
				i++;
				while (i < lines.length && !lines[i].trim().startsWith('```')) {
					codeLines.push(lines[i]);
					i++;
				}
				result.push({ type: 'code', language, content: codeLines.join('\n') });
				i++;
			} else if (line.startsWith('# ')) {
				result.push({ type: 'h1', content: line.substring(2) });
				i++;
			} else if (line.startsWith('## ')) {
				result.push({ type: 'h2', content: line.substring(3) });
				i++;
			} else if (line.startsWith('### ')) {
				result.push({ type: 'h3', content: line.substring(4) });
				i++;
			} else if (line.trim() === '---') {
				result.push({ type: 'hr' });
				i++;
			} else if (line.includes('|') && line.trim().startsWith('|')) {
				const tableLines = [];
				while (i < lines.length && lines[i].includes('|')) {
					tableLines.push(lines[i]);
					i++;
				}
				result.push({ type: 'table', content: parseTable(tableLines) });
			} else if (line.trim().match(/^- \[[ x]\]/)) {
				const listItems = [];
				while (i < lines.length && lines[i].trim().match(/^- \[[ x]\]/)) {
					const checked = lines[i].includes('[x]');
					const text = lines[i].trim().substring(6);
					listItems.push({ checked, text });
					i++;
				}
				result.push({ type: 'checklist', content: listItems });
			} else if (line.trim().startsWith('- ')) {
				const listItems = [];
				while (
					i < lines.length &&
					(lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('  -'))
				) {
					const indent = lines[i].search(/\S/);
					const text = lines[i].trim().substring(2);
					listItems.push({ text, indent });
					i++;
				}
				result.push({ type: 'list', content: listItems });
			} else if (line.trim() !== '') {
				result.push({ type: 'p', content: line });
				i++;
			} else {
				i++;
			}
		}

		return result;
	}

	function parseTable(lines: string[]) {
		if (lines.length < 2) return { headers: [], rows: [] };
		const headers = lines[0]
			.split('|')
			.map((h) => h.trim())
			.filter((h) => h !== '');
		const rows = lines.slice(2).map((row) =>
			row
				.split('|')
				.map((cell) => cell.trim())
				.filter((cell) => cell !== '')
		);
		return { headers, rows };
	}

	function parseInlineFormatting(text: string) {
		text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
		text = text.replace(
			/`(.*?)`/g,
			'<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-[#ff6b35]">$1</code>'
		);
		return text;
	}

	function getParsedContent(messageId: number | string, content: string): any[] {
		if (!parsedMessageContent.has(messageId)) {
			parsedMessageContent.set(messageId, parseMarkdown(content));
		}
		return parsedMessageContent.get(messageId)!;
	}

	const scrollToBottom = () => {
		if (chatContainer) {
			setTimeout(() => {
				chatContainer.scrollTo({
					top: chatContainer.scrollHeight,
					behavior: 'smooth'
				});
			}, 100);
		}
	};

	const sendMessage = async () => {
		const trimmedMessage = newMessageText.trim();
		if (trimmedMessage === '' || isLoading) return;

		// Create new conversation if none selected
		if (!selectedConversationId) {
			// Generate a new conversation ID
			selectedConversationId = `conv-${userId}-${Date.now()}`;
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

		const CONVERSATION_ID = '98b6495b-01fe-445f-804e-c20e1d3ba2d0';
		const USER_ID = '74f22a5f-8ed2-45ce-af2e-ac4c32d824f4';
		const REFERENCE_MESSAGE_ID = '123e4567-e89b-12d3-a456-426655440000';

		try {
			const response = await fetch('/api/server/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: CONVERSATION_ID,
					message: trimmedMessage,
					userId: USER_ID,
					referenceMessageId: REFERENCE_MESSAGE_ID
				})
			});

			if (response.ok) {
				const result = await response.json();
				const content = result?.Content || result?.content || result?.message || result?.Message;
				if (content) {
					const assistantMessage: Message = {
						id: Date.now() + 1,
						Content: content,
						Role: 'Assistant'
					};
					messages = [...messages, assistantMessage];
					scrollToBottom();
					// Reload conversations to update the list
					await loadConversations();
				}
			} else {
				console.error('Failed to send message:', response.statusText);
				const errorMessage: Message = {
					id: Date.now() + 1,
					Content: 'Sorry, I encountered an error. Please try again.',
					Role: 'Assistant'
				};
				messages = [...messages, errorMessage];
			}
		} catch (error) {
			console.error('Error sending message:', error);
			const errorMessage: Message = {
				id: Date.now() + 1,
				Content: 'Sorry, I encountered an error. Please try again.',
				Role: 'Assistant'
			};
			messages = [...messages, errorMessage];
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

	const newChat = () => {
		selectedConversationId = null;
		messages = [];
		newMessageText = '';
		parsedMessageContent.clear();
		selectionState.clear();
		if (inputElement) {
			inputElement.style.height = 'auto';
			setTimeout(() => {
				if (inputElement) {
					inputElement.style.height = '60px';
				}
			}, 0);
		}
	};

	$effect(() => {
		setTimeout(() => {
			if (inputElement) {
				inputElement.style.height = '60px';
			}
		}, 0);
		loadConversations();
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
							<button
								onclick={() => selectConversation(conversation.id)}
								class="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-3 text-left transition-all duration-200 hover:bg-white/8 {selectedConversationId ===
								conversation.id
									? 'bg-white/10'
									: ''}"
							>
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl">
									💬
								</div>
								<div class="min-w-0 flex-1">
									<div
										class="mb-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-white/90"
									>
										{conversation.title || 'Untitled Conversation'}
									</div>
									<div class="text-xs text-white/40">
										{formatDate(conversation.updatedAt || conversation.createdAt)}
									</div>
								</div>
							</button>
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
															</tr>
														{/each}
													</tbody>
												</table>
												{#if selectedRowsCount > 0}
													<div class="mt-3 flex justify-end">
														<button
															onclick={saveToLocalStorage}
															class="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]"
															title="Store selected rows in local storage"
														>
															<Icon icon="mdi:database-plus" width="18" height="18" />
															<span>Store in Database</span>
														</button>
													</div>
												{/if}
											</div>
										{:else if block.type === 'checklist'}
											<div class="my-3 space-y-2">
												<ul class="space-y-2">
													{#each block.content as item}
														<li class="flex items-start gap-3">
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
														</li>
													{/each}
												</ul>
											</div>
										{:else if block.type === 'list'}
											<div class="my-3 space-y-2">
												<ul class="space-y-2">
													{#each block.content as item}
														<li
															class="flex items-start gap-3"
															style="padding-left: {item.indent * 1.5}rem"
														>
															<span class="mt-1.5 text-[#ff6b35]">●</span>
															<span class="flex-1 text-white/90"
																>{@html parseInlineFormatting(item.text)}</span
															>
														</li>
													{/each}
												</ul>
											</div>
										{:else if block.type === 'p'}
											<p class="my-2 leading-relaxed text-white/90">
												{@html parseInlineFormatting(block.content)}
											</p>
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
