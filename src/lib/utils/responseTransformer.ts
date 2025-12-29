import type { LLMUIResponse, LLMUIBlock, DataType, FormatType, RenderType, Content } from '$lib/types/llmUIResponse';
import type { StructuredResponse } from '$lib/types/structuredResponse';

/**
 * Transform backend response to LLMUIResponse format
 */
export function transformBackendResponseToStructured(
	backendMessage: any
): StructuredResponse {
	const blocks: LLMUIBlock[] = [];

	const contentItems = getContentItems(backendMessage);

	if (!contentItems || contentItems.length === 0) {
		return { blocks: [] };
	}

	// Process each content item and convert to LLMUIBlock format
	for (const contentItem of contentItems) {
		if (!contentItem.type || !contentItem.data) continue;

		const block = convertContentItemToBlock(contentItem);
		if (block) {
			blocks.push(block);
		}
	}

	return { blocks };
}

/**
 * Convert a backend content item to LLMUIBlock format
 */
function convertContentItemToBlock(contentItem: any): LLMUIBlock | null {
	const { type, data } = contentItem;

	switch (type) {
		case 'text':
			return convertTextContent(data);
		case 'table':
			return convertTableContent(data);
		case 'list':
			return convertListContent(data);
		case 'interactive':
			return convertInteractiveContent(data);
		default:
			return null;
	}
}

/**
 * Convert text content to LLMUIBlock
 */
function convertTextContent(data: any): LLMUIBlock | null {
	const text = data?.text || '';
	if (!text.trim()) return null;

	const format = data?.format || 'plain';
	
	// Determine format and renderType based on backend format field
	let formatType: FormatType = 'text';
	let renderType: RenderType = 'text';

	if (format === 'markdown' || format === 'md') {
		formatType = 'markdown';
		renderType = 'markdown';
	} else {
		formatType = 'text';
		renderType = 'text';
	}

	return {
		datatype: 'text',
		format: formatType,
		renderType: renderType,
		content: text.trim()
	};
}

/**
 * Convert table content to LLMUIBlock
 */
function convertTableContent(data: any): LLMUIBlock | null {
	if (!data?.headers || !data?.rows) return null;

	// Convert table to objectArray format
	const tableData = data.rows.map((row: string[]) => {
		const rowObj: Record<string, any> = {};
		data.headers.forEach((header: string, index: number) => {
			rowObj[header] = row[index] || '';
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
 * Convert list content to LLMUIBlock
 */
function convertListContent(data: any): LLMUIBlock | null {
	if (!data?.items) return null;

	// Convert list items to objectArray format
	const listData = data.items.map((item: any, index: number) => ({
		index: index + 1,
		text: item.content || item.text || '',
		checked: item.checked || false
	}));

	return {
		datatype: 'json',
		format: 'objectArray',
		renderType: 'list',
		content: listData
	};
}

/**
 * Convert interactive content (suggestions) to LLMUIBlock
 */
function convertInteractiveContent(data: any): LLMUIBlock | null {
	if (!data || data.interactiveType !== 'suggestions' || !data.options) return null;

	// Convert options to objectArray format
	const optionsData = data.options.map((option: any) => ({
		id: option.id || option.value || '',
		label: option.label || option.value || '',
		value: option.value || option.action || '',
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
 * Normalize various backend response shapes to a single content array
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