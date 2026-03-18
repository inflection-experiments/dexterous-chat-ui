import type { LLMUIBlock, DataType, FormatType, RenderType, StructuredResponse } from '$lib/types/chat';
import type { Content, TextContent, TableContent, ListContent, CodeContent, InteractiveContent } from '$lib/types/backendTypes';

/**
 * Transform backend BotResponse to StructuredResponse format
 * Handles the new structured response format from dexterous-kiran backend
 */
export function transformBackendResponseToStructured(
	backendResponse: any
): StructuredResponse {
	const blocks: LLMUIBlock[] = [];

	// Extract BotResponse from various possible locations
	const botResponseArray = extractBotResponseArray(backendResponse);

	// Debug logging
	console.log('transformBackendResponseToStructured - botResponseArray found:', botResponseArray ? botResponseArray.length : null);

	if (botResponseArray && botResponseArray.length > 0) {
		// Sort by Sequence field if present
		const sortedResponses = [...botResponseArray].sort((a, b) => {
			const seqA = a.Sequence ?? 0;
			const seqB = b.Sequence ?? 0;
			return seqA - seqB;
		});

		for (const botResponse of sortedResponses) {
			const block = convertBotResponseToBlock(botResponse);
			if (block) {
				blocks.push(block);
			}
		}
	}

	// Fallback: Handle old format (Contents with 'type' field)
	if (blocks.length === 0) {
		const contentItems = getContentItems(backendResponse);
		for (const contentItem of contentItems) {
			if (!contentItem || typeof contentItem !== 'object' || !('type' in contentItem)) continue;
			const block = convertContentItemToBlock(contentItem as Content);
			if (block) {
				blocks.push(block);
			}
		}
	}

	return { blocks };
}

/**
 * Extract BotResponse array from various possible locations in the backend response
 */
function extractBotResponseArray(backendResponse: any): any[] | null {
	// Direct path: Data.BotResponse
	if (backendResponse?.Data?.BotResponse && Array.isArray(backendResponse.Data.BotResponse)) {
		return backendResponse.Data.BotResponse;
	}

	// Direct path: BotResponse at root level
	if (backendResponse?.BotResponse && Array.isArray(backendResponse.BotResponse)) {
		return backendResponse.BotResponse;
	}

	// Nested in AssistantContent array: AssistantContent[0].Data.BotResponse
	if (Array.isArray(backendResponse?.AssistantContent)) {
		for (const item of backendResponse.AssistantContent) {
			// Check for Data.BotResponse
			if (item?.Data?.BotResponse && Array.isArray(item.Data.BotResponse)) {
				return item.Data.BotResponse;
			}
			// Check for direct BotResponse on item
			if (item?.BotResponse && Array.isArray(item.BotResponse)) {
				return item.BotResponse;
			}
		}
		// Check if AssistantContent items themselves are BotResponse items
		const firstItem = backendResponse.AssistantContent[0];
		if (firstItem && 'Content' in firstItem && 'DataType' in firstItem && 'Format' in firstItem && 'RenderType' in firstItem) {
			return backendResponse.AssistantContent;
		}
	}

	// Nested in UserContent array: UserContent[0].Data.BotResponse
	if (Array.isArray(backendResponse?.UserContent)) {
		for (const item of backendResponse.UserContent) {
			if (item?.Data?.BotResponse && Array.isArray(item.Data.BotResponse)) {
				return item.Data.BotResponse;
			}
			if (item?.BotResponse && Array.isArray(item.BotResponse)) {
				return item.BotResponse;
			}
		}
	}

	// Check Data.Contents as BotResponse format
	if (backendResponse?.Data?.Contents && Array.isArray(backendResponse.Data.Contents)) {
		// Check if Contents items have BotResponse structure (Content, DataType, Format, RenderType)
		const firstItem = backendResponse.Data.Contents[0];
		if (firstItem && 'Content' in firstItem && 'DataType' in firstItem && 'Format' in firstItem) {
			return backendResponse.Data.Contents;
		}
	}

	return null;
}

/**
 * Convert BotResponse item to LLMUIBlock
 * Maps backend types (Content, DataType, Format, RenderType, Sequence) to frontend LLMUIBlock
 */
function convertBotResponseToBlock(botResponse: any): LLMUIBlock | null {
	let content = botResponse?.Content;
	if (content === undefined || content === null) return null;

	const dataType = normalizeDataType(botResponse.DataType);
	const format = normalizeFormat(botResponse.Format);
	let renderType = normalizeRenderType(botResponse.RenderType, format, content);

	// Detect markdown-wrapped code blocks: if renderType is 'code' but content is
	// wrapped in ```markdown fences, treat it as markdown text instead
	if (renderType === 'code' && typeof content === 'string') {
		const mdFenceMatch = content.trim().match(/^```\s*(?:markdown|md)\s*\n([\s\S]*?)\n\s*```\s*$/);
		if (mdFenceMatch && mdFenceMatch[1]) {
			renderType = 'markdown';
			content = mdFenceMatch[1].trim();
		}
	}

	return {
		datatype: dataType,
		format: format,
		renderType: renderType,
		content: content
	};
}

/**
 * Normalize backend DataType to our DataType
 */
function normalizeDataType(backendType: string): DataType {
	const normalized = (backendType || '').toLowerCase();
	if (normalized === 'json' || normalized === 'object') {
		return 'json';
	}
	return 'text';
}

/**
 * Normalize backend Format to our FormatType
 */
function normalizeFormat(backendFormat: string): FormatType {
	const normalized = (backendFormat || '').toLowerCase();
	if (normalized === 'markdown' || normalized === 'md') {
		return 'markdown';
	}
	if (normalized === 'object') {
		return 'object';
	}
	if (normalized === 'objectarray' || normalized === 'array') {
		return 'objectArray';
	}
	return 'text';
}

/**
 * Normalize backend RenderType to our RenderType
 * Handles all render types from structured.response.types.ts
 */
function normalizeRenderType(backendRenderType: string, format: FormatType, _content?: any): RenderType {
	const normalized = (backendRenderType || '').toLowerCase();

	// Map backend render types to frontend render types
	// Basic render types
	if (normalized === 'markdown' || normalized === 'md') {
		return 'markdown';
	}
	if (normalized === 'table' || normalized === 'twocolumntable') {
		return 'table';
	}
	if (normalized === 'list') {
		return 'list';
	}
	if (normalized === 'code') {
		return 'code';
	}
	if (normalized === 'json') {
		return 'json';
	}
	if (normalized === 'plaintext' || normalized === 'text') {
		// If format is markdown, render as markdown, otherwise as text
		return format === 'markdown' ? 'markdown' : 'text';
	}

	// Interactive UI elements - map to appropriate render types
	if (normalized === 'button') {
		return 'button';
	}
	if (normalized === 'dropdown') {
		return 'dropdown';
	}
	if (normalized === 'radiobutton') {
		return 'radioButton';
	}
	if (normalized === 'link') {
		return 'link';
	}
	if (normalized === 'form') {
		return 'form';
	}
	if (normalized === 'datepicker') {
		return 'datePicker';
	}
	if (normalized === 'colorpicker') {
		return 'colorPicker';
	}
	if (normalized === 'fileuploader') {
		return 'fileUploader';
	}
	if (normalized === 'progressbar') {
		return 'progressBar';
	}
	if (normalized === 'toggleswitch') {
		return 'toggleSwitch';
	}
	if (normalized === 'slider') {
		return 'slider';
	}

	// Default based on format
	return format === 'markdown' ? 'markdown' : 'text';
}

/**
 * Convert backend Content type to LLMUIBlock
 */
function convertContentItemToBlock(contentItem: Content): LLMUIBlock | null {
	switch (contentItem.type) {
		case 'text':
			return convertTextContentToBlock(contentItem);
		case 'table':
			return convertTableContentToBlock(contentItem);
		case 'list':
			return convertListContentToBlock(contentItem);
		case 'code':
			return convertCodeContentToBlock(contentItem);
		case 'interactive':
			return convertInteractiveContentToBlock(contentItem);
		case 'chart':
		case 'form':
		case 'image':
		case 'file':
			// These types are not yet supported in LLMUIBlock format
			// Convert to JSON for now
			return {
				datatype: 'json',
				format: 'object',
				renderType: 'json',
				content: contentItem
			};
		default:
			return null;
	}
}

/**
 * Convert TextContent to LLMUIBlock
 */
function convertTextContentToBlock(content: TextContent): LLMUIBlock | null {
	const text = content.data?.text || '';
	if (!text.trim()) return null;

	const format = content.data?.format || 'plain';
	let formatType: FormatType = 'text';
	let renderType: RenderType = 'text';

	if (format === 'markdown') {
		formatType = 'markdown';
		renderType = 'markdown';
	} else if (format === 'html') {
		formatType = 'text';
		renderType = 'text'; // HTML will be rendered as-is
	}

	return {
		datatype: 'text',
		format: formatType,
		renderType: renderType,
		content: text.trim()
	};
}

/**
 * Convert TableContent to LLMUIBlock
 */
function convertTableContentToBlock(content: TableContent): LLMUIBlock | null {
	if (!content.data?.headers || !content.data?.rows) return null;

	const tableData = content.data.rows.map((row: (string | number | boolean)[]) => {
		const rowObj: Record<string, any> = {};
		content.data.headers.forEach((header: string, index: number) => {
			rowObj[header] = row[index] ?? '';
		});
		return rowObj;
	});

	return {
		datatype: 'json',
		format: 'objectArray',
		renderType: 'table',
		content: tableData
	};
}

/**
 * Convert ListContent to LLMUIBlock
 */
function convertListContentToBlock(content: ListContent): LLMUIBlock | null {
	if (!content.data?.items) return null;

	const listData = content.data.items.map((item, index: number) => ({
		index: index + 1,
		text: item.content || '',
		subcontent: item.subcontent,
		icon: item.icon,
		link: item.link,
		checked: content.data.listType === 'checklist' ? false : undefined
	}));

	return {
		datatype: 'json',
		format: 'objectArray',
		renderType: 'list',
		content: listData
	};
}

/**
 * Convert CodeContent to LLMUIBlock
 */
function convertCodeContentToBlock(content: CodeContent): LLMUIBlock | null {
	if (!content.data?.code) return null;

	return {
		datatype: 'text',
		format: 'text',
		renderType: 'code',
		content: content.data.code
	};
}

/**
 * Convert InteractiveContent to LLMUIBlock
 */
function convertInteractiveContentToBlock(content: InteractiveContent): LLMUIBlock | null {
	if (!content.data?.options) return null;

	const optionsData = content.data.options.map((option) => ({
		id: option.id || '',
		label: option.label || '',
		value: option.value,
		icon: option.icon || '',
		description: option.description || ''
	}));

	return {
		datatype: 'json',
		format: 'objectArray',
		renderType: 'list',
		content: optionsData
	};
}

/**
 * Normalize various backend response shapes to a single content array (for old format)
 */
function getContentItems(backendMessage: any): any[] {
	if (Array.isArray(backendMessage?.AssistantContent)) {
		return backendMessage.AssistantContent;
	}
	if (Array.isArray(backendMessage?.Contents)) {
		return backendMessage.Contents;
	}
	if (Array.isArray(backendMessage?.Data?.AssistantContent)) {
		return backendMessage.Data.AssistantContent;
	}
	if (Array.isArray(backendMessage?.Data?.Contents)) {
		return backendMessage.Data.Contents;
	}
	return [];
}

