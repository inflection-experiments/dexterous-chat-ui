import type { Message } from '$lib/types/chat';
import type { Conversation } from '$lib/types/botTypes';
import type { Content, ChatMessageResponseDto } from '$lib/types/backendTypes';
import { transformBackendResponseToStructured } from './responseTransformer';

/**
 * Helper to extract text from BotResponse array (only text content, not structured data)
 */
function extractTextFromBotResponseArray(botResponses: any[]): string {
	const textParts: string[] = [];
	for (const botResponse of botResponses) {
		// Only extract TEXT content, not JSON objects (tables, buttons, etc.)
		if (botResponse.Content && typeof botResponse.Content === 'string') {
			// Skip if DataType is JSON or Format is Object/ObjectArray (these are structured data)
			const dataType = (botResponse.DataType || '').toLowerCase();
			const format = (botResponse.Format || '').toLowerCase();
			const renderType = (botResponse.RenderType || '').toLowerCase();

			// Only include text/markdown content, not structured data
			if (dataType !== 'json' &&
				format !== 'object' &&
				format !== 'objectarray' &&
				renderType !== 'table' &&
				renderType !== 'button' &&
				renderType !== 'dropdown' &&
				renderType !== 'radiobutton') {
				textParts.push(botResponse.Content);
			}
		}
	}
	return textParts.join('\n\n');
}

// API Response Handlers
export const extractAssistantContent = (result: any): string => {
	// Check for BotResponse at Data.BotResponse
	if (result.Data?.BotResponse && Array.isArray(result.Data.BotResponse)) {
		const text = extractTextFromBotResponseArray(result.Data.BotResponse);
		if (text) {
			return stripMarkdownCodeBlock(text);
		}
	}

	// Check for BotResponse at root level
	if (result.BotResponse && Array.isArray(result.BotResponse)) {
		const text = extractTextFromBotResponseArray(result.BotResponse);
		if (text) {
			return stripMarkdownCodeBlock(text);
		}
	}

	// Check for BotResponse nested in AssistantContent
	if (result.AssistantContent && Array.isArray(result.AssistantContent)) {
		for (const item of result.AssistantContent) {
			if (item?.Data?.BotResponse && Array.isArray(item.Data.BotResponse)) {
				const text = extractTextFromBotResponseArray(item.Data.BotResponse);
				if (text) {
					return stripMarkdownCodeBlock(text);
				}
			}
			if (item?.BotResponse && Array.isArray(item.BotResponse)) {
				const text = extractTextFromBotResponseArray(item.BotResponse);
				if (text) {
					return stripMarkdownCodeBlock(text);
				}
			}
		}
		// Check if AssistantContent items themselves are BotResponse format
		const firstItem = result.AssistantContent[0];
		if (firstItem && 'Content' in firstItem && 'DataType' in firstItem && 'RenderType' in firstItem) {
			const text = extractTextFromBotResponseArray(result.AssistantContent);
			if (text) {
				return stripMarkdownCodeBlock(text);
			}
		}
	}

	// Handle Data.Contents array format (old format from backend)
	if (result.Data?.Contents && Array.isArray(result.Data.Contents)) {
		const textParts: string[] = [];
		for (const content of result.Data.Contents) {
			if (content.type === 'text' && content.data?.text) {
				textParts.push(content.data.text);
			}
		}
		if (textParts.length > 0) {
			return stripMarkdownCodeBlock(textParts.join('\n\n'));
		}
	}

	const contentSources = [
		() => result.Data?.[result.Data.length - 1]?.AssistantContent,
		() => result.Data?.AssistantContent,
		() => result.Content,
		() => result.content,
		() => result.message,
		() => result.Message,
		() => result.Data?.Content
	];

	for (const getContent of contentSources) {
		const content = getContent();
		if (Array.isArray(content)) {
			const text = content
				.filter((c: any) => c.type === 'text' && c.data?.text)
				.map((c: any) => c.data.text)
				.join('\n');
			if (text) {
				return stripMarkdownCodeBlock(text);
			}
		}
		if (typeof content === 'string' && content) {
			return stripMarkdownCodeBlock(content);
		}
	}

	return '';
};

/**
 * Convert a backend response (or message) into an Assistant UI message with structured content
 */
export const buildAssistantMessageFromResult = (
	result: any,
	customId?: number | string
): Message | null => {
	const payload = result?.Data || result?.data || result;

	// Transform to structured response
	const structured = transformBackendResponseToStructured(result);
	const hasStructured = structured.blocks && structured.blocks.length > 0;

	// Debug logging
	console.log('buildAssistantMessageFromResult - input:', JSON.stringify(result, null, 2).slice(0, 500));
	console.log('buildAssistantMessageFromResult - structured blocks:', structured.blocks.length, hasStructured);

	// Extract text content for fallback
	const text = extractAssistantContent(result);
	const fallbackText =
		text ||
		payload?.Content ||
		payload?.content ||
		payload?.Message ||
		result?.Message ||
		result?.message ||
		'';

	// If we have structured blocks, use them even if no text
	if (hasStructured) {
		return {
			id: customId ?? Date.now(),
			Content: stripMarkdownCodeBlock(fallbackText || ''),
			Role: 'Assistant',
			StructuredResponse: structured
		};
	}

	// If we have text but no structured blocks, return message with text
	if (fallbackText) {
		return {
			id: customId ?? Date.now(),
			Content: stripMarkdownCodeBlock(fallbackText),
			Role: 'Assistant'
		};
	}

	// No content at all
	return null;
};

/**
 * Strip markdown code block wrappers (```markdown ... ``` or ``` ... ```)
 * Handles various formats including with/without newlines and whitespace
 */
export function stripMarkdownCodeBlock(text: string): string {
	if (!text) return text;
	
	let cleaned = text.trim();
	
	// Remove markdown code block wrapper - handle multiple patterns
	// Pattern 1: ```markdown\n...\n``` (with newlines)
	const pattern1 = /^```\s*markdown\s*\n([\s\S]*?)\n\s*```\s*$/;
	// Pattern 2: ```markdown ... ``` (without newlines)
	const pattern2 = /^```\s*markdown\s*([\s\S]*?)\s*```\s*$/;
	// Pattern 3: ```\n...\n``` (generic code block with newlines)
	const pattern3 = /^```\s*\n([\s\S]*?)\n\s*```\s*$/;
	// Pattern 4: ``` ... ``` (generic code block without newlines)
	const pattern4 = /^```\s*([\s\S]*?)\s*```\s*$/;
	
	let match = cleaned.match(pattern1);
	if (match && match[1]) {
		return match[1].trim();
	}
	
	match = cleaned.match(pattern2);
	if (match && match[1]) {
		return match[1].trim();
	}
	
	match = cleaned.match(pattern3);
	if (match && match[1]) {
		return match[1].trim();
	}
	
	match = cleaned.match(pattern4);
	if (match && match[1]) {
		return match[1].trim();
	}
	
	return cleaned;
}

/**
 * Helper to check if a BotResponse item is text content (not a UI element like button/table)
 */
function isTextContent(botResponse: any): boolean {
	if (!botResponse || typeof botResponse.Content !== 'string') {
		return false;
	}
	const dataType = (botResponse.DataType || '').toLowerCase();
	const format = (botResponse.Format || '').toLowerCase();
	const renderType = (botResponse.RenderType || '').toLowerCase();

	// Exclude structured/interactive content
	if (dataType === 'json' ||
		format === 'object' ||
		format === 'objectarray' ||
		renderType === 'table' ||
		renderType === 'button' ||
		renderType === 'dropdown' ||
		renderType === 'radiobutton') {
		return false;
	}
	return true;
}

/**
 * Extract text from Content array or single Content
 * Handles both old format {type: 'text', data: {text: '...'}}
 * and new BotResponse format {Data: {BotResponse: [{Content: '...'}]}}
 * Only extracts TEXT content, not JSON/structured data
 */
function extractTextFromContents(contents: Content[] | Content | any[] | any | undefined): string {
	if (!contents) return '';

	const contentArray = Array.isArray(contents) ? contents : [contents];
	const textParts: string[] = [];

	for (const content of contentArray) {
		// Old format: {type: 'text', data: {text: '...'}}
		if (content.type === 'text' && content.data?.text) {
			textParts.push(content.data.text);
		}
		// New BotResponse format nested in Data: {Data: {BotResponse: [{Content: '...'}]}}
		else if (content.Data?.BotResponse && Array.isArray(content.Data.BotResponse)) {
			for (const botResponse of content.Data.BotResponse) {
				if (isTextContent(botResponse)) {
					textParts.push(botResponse.Content);
				}
			}
		}
		// Direct BotResponse array format
		else if (content.BotResponse && Array.isArray(content.BotResponse)) {
			for (const botResponse of content.BotResponse) {
				if (isTextContent(botResponse)) {
					textParts.push(botResponse.Content);
				}
			}
		}
		// Direct Content field (string) - only if it's text type
		else if (content.Content && typeof content.Content === 'string' && isTextContent(content)) {
			textParts.push(content.Content);
		}
	}

	return textParts.join('\n');
}

export const extractFirstUserMessage = (message: any): string => {
	if (!message) return '';

	const userContent = message.UserContent;
	if (userContent) {
		const contentArray = Array.isArray(userContent) ? userContent : [userContent];
		if (contentArray.length > 0) {
			const firstContent = contentArray[0];
			// Old format: {type: 'text', data: {text: '...'}}
			if (firstContent.type === 'text' && firstContent.data?.text) {
				return firstContent.data.text;
			}
			// New BotResponse format: {Data: {BotResponse: [{Content: '...'}]}}
			if (firstContent.Data?.BotResponse && Array.isArray(firstContent.Data.BotResponse)) {
				const firstBotResponse = firstContent.Data.BotResponse[0];
				if (firstBotResponse?.Content && typeof firstBotResponse.Content === 'string') {
					return firstBotResponse.Content;
				}
			}
		}
	}

	return typeof message.Content === 'string' ? message.Content : '';
};

// Message Conversion
export const convertBackendMessageToUIMessage = (backendMsg: ChatMessageResponseDto | any): Message[] => {
	const messages: Message[] = [];

	// User message (if available)
	const userContent = backendMsg.UserContent;
	if (userContent) {
		const userText = extractTextFromContents(userContent);
		if (userText.trim()) {
			messages.push({
				id: `${backendMsg.id || Date.now()}-user`,
				Content: stripMarkdownCodeBlock(userText),
				Role: 'User'
			});
		}
	}

	// Assistant message - try to build with structured response
	// buildAssistantMessageFromResult and transformBackendResponseToStructured handle all formats
	const assistantMessage = buildAssistantMessageFromResult(
		backendMsg,
		`${backendMsg.id || Date.now()}-assistant`
	);

	if (assistantMessage) {
		messages.push(assistantMessage);
	}

	return messages;
};

// API Calls
export const apiCall = async (url: string, options: RequestInit = {}) => {
	const response = await fetch(url, {
		headers: { 'Content-Type': 'application/json', ...options.headers },
		...options
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`API Error: ${response.status} - ${errorText}`);
	}

	return response.json();
};

export const sendChatMessage = async (
	conversationId: string,
	message: string,
	userId: string,
	referenceMessageId: string
) => {
	return apiCall('/api/server/chat', {
		method: 'POST',
		body: JSON.stringify({ conversationId, message, userId, referenceMessageId })
	});
};

export const createConversation = async (projectId: string, userId: string) => {
	return apiCall('/api/server/conversations', {
		method: 'POST',
		body: JSON.stringify({ ProjectId: projectId, userId })
	});
};

export const fetchConversationMessages = async (conversationId: string) => {
	return apiCall(`/api/server/conversations/${conversationId}/messages`);
};

export const deleteConversationAPI = async (conversationId: string) => {
	return apiCall(`/api/server/conversations/${conversationId}`, {
		method: 'DELETE'
	});
};

// Message Extraction Helpers
export const extractMessagesFromResponse = (result: any): any[] => {
	const sources = [
		result.Data?.Items,
		result.Data,
		result.data,
		result.messages,
		Array.isArray(result) ? result : null
	];

	return sources.find((source) => Array.isArray(source) && source.length > 0) || [];
};

// Text Formatting
export const truncateText = (text: string = '', maxLength: number = 50): string => {
	if (!text) return 'New conversation';
	return text.length <= maxLength ? text : text.substring(0, maxLength) + '...';
};

export const truncateUUID = (uuid: string = '', length: number = 8): string => {
	if (!uuid) return 'Unknown';
	return uuid.length <= length ? uuid : uuid.substring(0, length) + '...';
};

export const formatDate = (dateString?: string): string => {
	if (!dateString) return 'Unknown';

	const date = new Date(dateString);
	if (isNaN(date.getTime())) return 'Invalid date';

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'Just now';
	if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
	if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
};

// Selection State Management
export const createSelectionState = () => {
	const state = new Map<number | string, Map<number, { type: string; selected: Set<number> }>>();

	const get = (messageId: number | string, blockIndex: number, itemType: string): { type: string; selected: Set<number> } => {
		if (!state.has(messageId)) {
			state.set(messageId, new Map());
		}
		const messageSelections = state.get(messageId)!;
		if (!messageSelections.has(blockIndex)) {
			messageSelections.set(blockIndex, { type: itemType, selected: new Set<number>() });
		}
		const blockState = messageSelections.get(blockIndex)!;
		if (blockState.type !== itemType) {
			blockState.type = itemType;
			blockState.selected.clear();
		}
		return blockState;
	};

	return {
		get,

		toggle: (
			messageId: number | string,
			blockIndex: number,
			itemIndex: number,
			itemType: string
		) => {
			const blockState = get(messageId, blockIndex, itemType);
			if (blockState.selected.has(itemIndex)) {
				blockState.selected.delete(itemIndex);
			} else {
				blockState.selected.add(itemIndex);
			}
			return new Map(state);
		},

		isSelected: (
			messageId: number | string,
			blockIndex: number,
			itemIndex: number,
			itemType?: string
		): boolean => {
			const blockState = state.get(messageId)?.get(blockIndex);
			if (!blockState) return false;
			if (itemType && blockState.type !== itemType) return false;
			return blockState.selected.has(itemIndex);
		},

		toggleAll: (
			messageId: number | string,
			blockIndex: number,
			totalItems: number,
			itemType: string
		) => {
			const blockState = get(messageId, blockIndex, itemType);
			const allSelected = blockState.selected.size === totalItems && totalItems > 0;
			if (allSelected) {
				blockState.selected.clear();
			} else {
				blockState.selected = new Set(Array.from({ length: totalItems }, (_, i) => i));
			}
			return new Map(state);
		},

		getCount: (messageId: number | string, blockIndex: number, itemType?: string): number => {
			const blockState = state.get(messageId)?.get(blockIndex);
			if (!blockState) return 0;
			if (itemType && blockState.type !== itemType) return 0;
			return blockState.selected.size;
		},

		clear: () => {
			state.clear();
		},

		getState: () => state
	};
};

// Conversation Helpers
export const sortConversations = (conversations: Conversation[]): Conversation[] => {
	return [...conversations].sort((a: any, b: any) => {
		const dateA = new Date(a.CreatedAt || a.createdAt || 0).getTime();
		const dateB = new Date(b.CreatedAt || b.createdAt || 0).getTime();
		return dateB - dateA;
	});
};

export const extractConversationId = (result: any): string | null => {
	return result.Data?.id || result.data?.id || result.id || result.conversationId || null;
};

/**
 * Extract title from a conversation object
 * Checks multiple possible fields where title might be stored
 */
export const extractConversationTitle = (conversation: any): string | null => {
	if (!conversation) return null;

	// Check various possible title fields (case-insensitive)
	const title =
		conversation.title ||
		conversation.Title ||
		conversation.name ||
		conversation.Name ||
		conversation.subject ||
		conversation.Subject;

	return title || null;
};

/**
 * Extract titles from conversations and return a map of conversationId -> title
 * This can be used on initial load to populate titles from backend data
 */
export const extractConversationTitles = async (
	conversations: Conversation[],
	fetchMessagesFn?: (conversationId: string) => Promise<any>
): Promise<Map<string, string>> => {
	const titles = new Map<string, string>();

	for (const conv of conversations) {
		// First, try to get title from conversation object
		const titleFromConv = extractConversationTitle(conv);
		if (titleFromConv) {
			titles.set(conv.id, titleFromConv);
			continue;
		}

		// If no title in conversation object and fetch function provided, try to get first message
		if (fetchMessagesFn) {
			try {
				const messagesResult = await fetchMessagesFn(conv.id);
				const messages = extractMessagesFromResponse(messagesResult);

				// Find first user message
				for (const msg of messages) {
					const userMessage = extractFirstUserMessage(msg);
					if (userMessage) {
						titles.set(conv.id, userMessage);
						break;
					}
				}
			} catch (error) {
				console.warn(`Failed to fetch title for conversation ${conv.id}:`, error);
				// Continue with other conversations
			}
		}
	}

	return titles;
};
