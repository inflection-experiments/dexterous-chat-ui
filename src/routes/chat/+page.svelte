<script lang="ts">
	import type { Message } from '$lib/types/chat.ts';
	import Icon from '@iconify/svelte';
	import { parseMarkdown, parseTable, parseInlineFormatting } from '$lib/utils/markdownParser.ts';

	// import type { Message } from '$lib/types/chat';

	const CONVERSATION_ID = '98b6495b-01fe-445f-804e-c20e1d3ba2d0';
	const USER_ID = '74f22a5f-8ed2-45ce-af2e-ac4c32d824f4';
	const REFERENCE_MESSAGE_ID = '123e4567-e89b-12d3-a456-426655440000';

	// Local storage key for this conversation
	const STORAGE_KEY = `chat_conversation_${CONVERSATION_ID}`;

	// Initialize conversation data in localStorage
	function initializeConversationData() {
		if (typeof window === 'undefined') return;
		
		const stored = localStorage.getItem(STORAGE_KEY);
		if (!stored) {
			const conversationData = {
				conversationId: CONVERSATION_ID,
				userId: USER_ID,
				referenceMessageId: REFERENCE_MESSAGE_ID,
				timestamp: new Date().toISOString(),
				messages: []
			};
			localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationData));
		}
	}

	// Load conversation data from localStorage
	function loadConversationData() {
		if (typeof window === 'undefined') return null;
		
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (!stored) return null;
			return JSON.parse(stored);
		} catch (error) {
			console.error('Error loading conversation data:', error);
			return null;
		}
	}

	// Save conversation data to localStorage
	function saveConversationData(conversationData: any) {
		if (typeof window === 'undefined') return;
		
		try {
			conversationData.timestamp = new Date().toISOString();
			localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationData));
		} catch (error) {
			console.error('Error saving conversation data:', error);
		}
	}

	// Initialize on component mount and load messages
	$effect(() => {
		initializeConversationData();
		
		// Load messages from localStorage if available
		const conversationData = loadConversationData();
		if (conversationData && conversationData.messages && conversationData.messages.length > 0) {
			messages = conversationData.messages;
		}
	});

	let messages = $state<Message[]>([]);
	let newMessageText = $state('');
	let chatContainer = $state<HTMLElement | null>(null);
	let inputElement = $state<HTMLTextAreaElement | null>(null);
	let isLoading = $state(false);
	let sidebarOpen = $state(true);
	let inputFocused = $state(false);

	// Store parsed content for each message to enable editing
	let parsedMessageContent = $state(new Map<number | string, any[]>());

	// Store selection state for each message: { messageId: { blockIndex: { type: 'table'|'list'|'checklist', selected: Set<indices> } } }
	let selectionState = $state(
		new Map<number | string, Map<number, { type: string; selected: Set<number> }>>()
	);

	// Markdown parsing functions

	// Reconstruct markdown from parsed blocks
	function reconstructMarkdown(blocks: any[]): string {
		let md = '';

		for (const block of blocks) {
			if (block.type === 'h1') {
				md += `# ${block.content}\n\n`;
			} else if (block.type === 'h2') {
				md += `## ${block.content}\n\n`;
			} else if (block.type === 'h3') {
				md += `### ${block.content}\n\n`;
			} else if (block.type === 'hr') {
				md += '---\n\n';
			} else if (block.type === 'code') {
				md += `\`\`\`${block.language || ''}\n${block.content}\n\`\`\`\n\n`;
			} else if (block.type === 'table') {
				// Reconstruct table
				const headers = block.content.headers.join(' | ');
				md += `| ${headers} |\n`;
				md += `| ${block.content.headers.map(() => '---').join(' | ')} |\n`;
				for (const row of block.content.rows) {
					md += `| ${row.join(' | ')} |\n`;
				}
				md += '\n';
			} else if (block.type === 'checklist') {
				for (const item of block.content) {
					md += `- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
				}
				md += '\n';
			} else if (block.type === 'list') {
				for (const item of block.content) {
					const indent = ' '.repeat(item.indent);
					md += `${indent}- ${item.text}\n`;
				}
				md += '\n';
			} else if (block.type === 'p') {
				md += `${block.content}\n\n`;
			}
		}

		return md.trim();
	}

	// Get or parse content for a message
	function getParsedContent(messageId: number | string, content: string): any[] {
		if (!parsedMessageContent.has(messageId)) {
			parsedMessageContent.set(messageId, parseMarkdown(content));
		}
		return parsedMessageContent.get(messageId)!;
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
			const newParsed = [...parsed];
			const tableBlock = { ...newParsed[blockIndex] };
			tableBlock.content = {
				...tableBlock.content,
				rows: tableBlock.content.rows.filter((_: any, idx: number) => idx !== rowIndex)
			};
			newParsed[blockIndex] = tableBlock;
			parsedMessageContent.set(messageId, newParsed);
			updateMessageContent(messageId);
		}
	}

	// Delete table column
	function deleteTableColumn(messageId: number | string, blockIndex: number, colIndex: number) {
		const parsed = parsedMessageContent.get(messageId);
		if (parsed && parsed[blockIndex]?.type === 'table') {
			const newParsed = [...parsed];
			const tableBlock = { ...newParsed[blockIndex] };
			const oldContent = tableBlock.content;
			tableBlock.content = {
				headers: oldContent.headers.filter((_: string, idx: number) => idx !== colIndex),
				rows: oldContent.rows.map((row: string[]) =>
					row.filter((_: string, idx: number) => idx !== colIndex)
				)
			};
			newParsed[blockIndex] = tableBlock;
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
			const newParsed = [...parsed];
			const listBlock = { ...newParsed[blockIndex] };
			listBlock.content = listBlock.content.filter((_: any, idx: number) => idx !== itemIndex);

			// If list is empty, remove the entire block
			if (listBlock.content.length === 0) {
				newParsed.splice(blockIndex, 1);
			} else {
				newParsed[blockIndex] = listBlock;
			}

			parsedMessageContent.set(messageId, newParsed);
			updateMessageContent(messageId);
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
		// Clear selection if switching types
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
		// Trigger reactivity
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
		// If itemType is provided, only check if types match
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

	function deleteSelectedItems(messageId: number | string, blockIndex: number) {
		const state = selectionState.get(messageId)?.get(blockIndex);
		if (!state || state.selected.size === 0) return;

		const parsed = parsedMessageContent.get(messageId);
		if (!parsed) return;

		const newParsed = [...parsed];
		const block = newParsed[blockIndex];

		if (block.type === 'table' && state.type === 'table-rows') {
			const tableBlock = { ...block };
			tableBlock.content = {
				...tableBlock.content,
				rows: tableBlock.content.rows.filter((_: any, idx: number) => !state.selected.has(idx))
			};
			newParsed[blockIndex] = tableBlock;
		} else if (block.type === 'list' || block.type === 'checklist') {
			const listBlock = { ...block };
			listBlock.content = listBlock.content.filter(
				(_: any, idx: number) => !state.selected.has(idx)
			);

			if (listBlock.content.length === 0) {
				newParsed.splice(blockIndex, 1);
			} else {
				newParsed[blockIndex] = listBlock;
			}
		}

		// Clear selection
		state.selected.clear();
		parsedMessageContent.set(messageId, newParsed);
		updateMessageContent(messageId);
		selectionState = new Map(selectionState);
	}

	function deleteSelectedColumns(messageId: number | string, blockIndex: number) {
		const state = selectionState.get(messageId)?.get(blockIndex);
		if (!state || state.selected.size === 0 || state.type !== 'table-columns') return;

		const parsed = parsedMessageContent.get(messageId);
		if (!parsed || parsed[blockIndex]?.type !== 'table') return;

		const newParsed = [...parsed];
		const tableBlock = { ...newParsed[blockIndex] };
		const oldContent = tableBlock.content;

		tableBlock.content = {
			headers: oldContent.headers.filter((_: string, idx: number) => !state.selected.has(idx)),
			rows: oldContent.rows.map((row: string[]) =>
				row.filter((_: string, idx: number) => !state.selected.has(idx))
			)
		};

		// Clear selection
		state.selected.clear();
		newParsed[blockIndex] = tableBlock;
		parsedMessageContent.set(messageId, newParsed);
		updateMessageContent(messageId);
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

		// Get conversation data from localStorage
		let conversationData = loadConversationData() || {
			conversationId: CONVERSATION_ID,
			userId: USER_ID,
			referenceMessageId: REFERENCE_MESSAGE_ID,
			timestamp: new Date().toISOString(),
			messages: []
		};

		// Add user message to the UI
		const userMessage: Message = {
			id: Date.now(),
			Content: trimmedMessage,
			Role: 'User'
		};
		messages = [...messages, userMessage];
		newMessageText = '';
		isLoading = true;
		scrollToBottom();

		// Use stored referenceMessageId or fallback to constant
		const currentReferenceMessageId = conversationData.referenceMessageId || REFERENCE_MESSAGE_ID;

		try {
			// Send message to our SvelteKit backend
			const response = await fetch('/api/server/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					conversationId: CONVERSATION_ID,
					message: trimmedMessage,
					userId: USER_ID,
					referenceMessageId: currentReferenceMessageId
				})
			});

			if (response.ok) {
				const result = await response.json();
				// Handle the response structure from ResponseHandler
				const content = result?.Content || result?.content || result?.message || result?.Message;
				if (content) {
					const assistantMessage: Message = {
						id: Date.now() + 1,
						Content: content,
						Role: 'Assistant'
					};
					messages = [...messages, assistantMessage];
					
					// Keep using the static referenceMessageId
					conversationData.referenceMessageId = REFERENCE_MESSAGE_ID;
					conversationData.messages = messages;
					saveConversationData(conversationData);
					
					scrollToBottom();
				}
			} else {
				console.error('Failed to send message:', response.statusText);
				const errorMessage: Message = {
					id: Date.now() + 1,
					Content: 'Sorry, I encountered an error. Please try again.',
					Role: 'Assistant'
				};
				messages = [...messages, errorMessage];
				
				// Save messages even on error
				conversationData.messages = messages;
				saveConversationData(conversationData);
			}
		} catch (error) {
			console.error('Error sending message:', error);
			const errorMessage: Message = {
				id: Date.now() + 1,
				Content: 'Sorry, I encountered an error. Please try again.',
				Role: 'Assistant'
			};
			messages = [...messages, errorMessage];
			
			// Save messages even on error
			conversationData.messages = messages;
			saveConversationData(conversationData);
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

	$effect(() => {
		// Set initial height after component mounts
		setTimeout(() => {
			if (inputElement) {
				inputElement.style.height = '60px';
			}
		}, 0);
	});

	const newChat = () => {
		messages = [];
		newMessageText = '';
		parsedMessageContent.clear();
		selectionState.clear();
		
		// Reset conversation data in localStorage
		const conversationData = {
			conversationId: CONVERSATION_ID,
			userId: USER_ID,
			referenceMessageId: REFERENCE_MESSAGE_ID,
			timestamp: new Date().toISOString(),
			messages: []
		};
		saveConversationData(conversationData);
		
		if (inputElement) {
			inputElement.style.height = 'auto';
			setTimeout(() => {
				if (inputElement) {
					inputElement.style.height = '60px';
				}
			}, 0);
		}
	};
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
				<div class="flex flex-col gap-2">
					<div
						class="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-3 transition-all duration-200 hover:bg-white/8"
					>
						<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl">
							💬
						</div>
						<div class="min-w-0 flex-1">
							<div
								class="mb-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-white/90"
							>
								Database Models Discussion
							</div>
							<div class="text-xs text-white/40">2 hours ago</div>
						</div>
					</div>
					<div
						class="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-3 transition-all duration-200 hover:bg-white/8"
					>
						<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl">
							⚛️
						</div>
						<div class="min-w-0 flex-1">
							<div
								class="mb-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-white/90"
							>
								React Component Help
							</div>
							<div class="text-xs text-white/40">Yesterday</div>
						</div>
					</div>
					<div
						class="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-3 transition-all duration-200 hover:bg-white/8"
					>
						<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl">
							✉️
						</div>
						<div class="min-w-0 flex-1">
							<div
								class="mb-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-white/90"
							>
								Email Writing
							</div>
							<div class="text-xs text-white/40">3 days ago</div>
						</div>
					</div>
				</div>
			</div>
		</div>

		<div class="border-t border-white/10 px-5 py-5">
			<div
				class="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-white/5"
			>
				<div
					class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-base font-semibold text-white shadow-[0_2px_8px_rgba(255,107,53,0.3)]"
				>
					<span>T</span>
				</div>
				<div class="min-w-0 flex-1">
					<div
						class="mb-0.5 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap text-white"
					>
						Tushar
					</div>
					<div class="text-xs text-white/50">Free Plan</div>
				</div>
				<button
					class="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent text-white/50 transition-all duration-200 hover:bg-white/10 hover:text-white/90"
					title="Settings"
				>
					<Icon icon="mdi:cog" width="18" height="18" />
				</button>
			</div>
		</div>
	</aside>

	<!-- Main Content -->
	<main class="relative flex h-screen flex-1 flex-col overflow-hidden">
		{#if messages.length === 0}
			<!-- Welcome Screen -->
			<div class="relative flex h-full flex-col items-center justify-start px-8 pt-16 pb-1 text-center">
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
						Welcome back, Tushar
					</h1>
					<p class="m-0 text-xl leading-relaxed font-normal text-white/60">
						I'm here to help you with anything you need. What would you like to explore today?
					</p>
				</div>
				<div class="grid w-full max-w-[600px] grid-cols-2 gap-4">
					<button
						class="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,107,53,0.3)] hover:bg-white/8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
						style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
					>
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,53,0.1)] text-2xl"
						>
							💡
						</div>
						<div class="flex-1">
							<div class="mb-1 text-[0.95rem] font-semibold text-white">Get Ideas</div>
							<div class="text-xs text-white/50">Brainstorm and explore</div>
						</div>
					</button>
					<button
						class="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,107,53,0.3)] hover:bg-white/8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
						style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
					>
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,53,0.1)] text-2xl"
						>
							📝
						</div>
						<div class="flex-1">
							<div class="mb-1 text-[0.95rem] font-semibold text-white">Write Content</div>
							<div class="text-xs text-white/50">Articles, emails, and more</div>
						</div>
					</button>
					<button
						class="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,107,53,0.3)] hover:bg-white/8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
						style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
					>
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,53,0.1)] text-2xl"
						>
							💻
						</div>
						<div class="flex-1">
							<div class="mb-1 text-[0.95rem] font-semibold text-white">Code Help</div>
							<div class="text-xs text-white/50">Debug and optimize</div>
						</div>
					</button>
					<button
						class="flex cursor-pointer items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-[rgba(255,107,53,0.3)] hover:bg-white/8 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
						style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
					>
						<div
							class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-[rgba(255,107,53,0.1)] text-2xl"
						>
							🎓
						</div>
						<div class="flex-1">
							<div class="mb-1 text-[0.95rem] font-semibold text-white">Learn</div>
							<div class="text-xs text-white/50">Explain concepts</div>
						</div>
					</button>
				</div>
			</div>
		{:else}
			<!-- Chat Messages -->
			<div
				bind:this={chatContainer}
				class="flex-1 overflow-x-hidden overflow-y-auto scroll-smooth px-8 py-8 pb-40"
			>
				{#each messages as message, index (message.id)}
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
														<button
															class="rounded bg-red-500/80 px-2 py-1 text-xs text-white transition-colors hover:bg-red-500"
															onclick={() => deleteSelectedItems(message.id, blockIndex)}
															title="Delete selected rows"
														>
															Delete Selected
														</button>
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
															{#each block.content.headers as header, colIndex}
																<th
																	class="group/th relative px-4 py-3 text-left text-sm font-semibold tracking-wider text-white"
																>
																	<div class="flex items-center gap-2">
																		<span>{@html parseInlineFormatting(header)}</span>
																		{#if block.content.headers.length > 1}
																			<button
																				class="rounded bg-white/20 px-1.5 py-0.5 text-xs text-white/60 opacity-0 transition-opacity group-hover/th:opacity-100 hover:bg-red-500/80 hover:text-white"
																				onclick={() =>
																					deleteTableColumn(message.id, blockIndex, colIndex)}
																				title="Delete column"
																			>
													<Icon icon="mdi:close" width="12" height="12" />
																			</button>
																		{/if}
																	</div>
																</th>
															{/each}
															<th
																class="w-12 px-2 py-3 text-left text-sm font-semibold tracking-wider text-white"
															></th>
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
																	<td class="px-4 py-3 text-sm whitespace-nowrap text-white/90">
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
								<span>T</span>
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
						? 'border-[rgba(255,107,53,0.4)] bg-white/8 outline-none ring-2 ring-[rgba(255,107,53,0.2)]'
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

	:global(textarea::-webkit-input-placeholder) {
		color: rgba(255, 255, 255, 0.4);
		opacity: 1;
	}

	:global(textarea::-moz-placeholder) {
		color: rgba(255, 255, 255, 0.4);
		opacity: 1;
	}

	:global(textarea:-ms-input-placeholder) {
		color: rgba(255, 255, 255, 0.4);
		opacity: 1;
	}

	:global(select option) {
		background: #1a1a2e;
		color: #ffffff;
	}
</style>
