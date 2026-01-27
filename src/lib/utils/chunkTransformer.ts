import type { ResponseChunk, ChunkType, BotResponseItem } from '$lib/types/streaming';
import type { LLMUIBlock, DataType, FormatType, RenderType } from '$lib/types/chat';

/**
 * Convert a streaming chunk to an LLMUIBlock
 */
export function convertChunkToBlock(chunk: ResponseChunk): LLMUIBlock | null {
	const { item } = chunk;
	if (!item || item.Content === undefined || item.Content === null) {
		return null;
	}

	const dataType = normalizeDataType(item.DataType);
	const format = normalizeFormat(item.Format);
	const renderType = normalizeRenderType(item.RenderType, format, chunk.chunkType);

	return {
		datatype: dataType,
		format: format,
		renderType: renderType,
		content: item.Content
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
 * Uses ChunkType as additional context for determining render type
 */
function normalizeRenderType(
	backendRenderType: string,
	format: FormatType,
	chunkType: ChunkType
): RenderType {
	const normalized = (backendRenderType || '').toLowerCase();

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
		return format === 'markdown' ? 'markdown' : 'text';
	}

	// Interactive UI elements
	if (normalized === 'button') {
		return 'button';
	}
	if (normalized === 'dropdown') {
		return 'dropdown';
	}
	if (normalized === 'radiobutton' || normalized === 'radio') {
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

	// Use ChunkType as fallback for determining render type
	return mapChunkTypeToRenderType(chunkType, format);
}

/**
 * Map ChunkType to RenderType as fallback
 */
function mapChunkTypeToRenderType(chunkType: ChunkType, format: FormatType): RenderType {
	// Import ChunkType enum values for comparison
	const ChunkType = {
		INTRODUCTION: 'introduction',
		DESCRIPTION: 'description',
		EXPLANATION: 'explanation',
		CLOSING: 'closing',
		TABLE: 'table',
		TWO_COLUMN_TABLE: 'two_column_table',
		LIST: 'list',
		CODE: 'code',
		JSON_VIEW: 'json_view',
		SUMMARY: 'summary',
		INFO: 'info',
		BUTTON: 'button',
		BUTTON_GROUP: 'button_group',
		DROPDOWN: 'dropdown',
		RADIO: 'radio',
		CHECKBOX: 'checkbox',
		FORM: 'form',
		LINK: 'link',
		DATE_PICKER: 'date_picker',
		COLOR_PICKER: 'color_picker',
		FILE_UPLOADER: 'file_uploader',
		SLIDER: 'slider',
		TOGGLE: 'toggle',
		PROGRESS: 'progress',
		ERROR: 'error',
		SUCCESS: 'success',
		WARNING: 'warning',
		NEXT_STEPS: 'next_steps'
	};

	switch (chunkType) {
		// Text content - use markdown if format is markdown
		case ChunkType.INTRODUCTION:
		case ChunkType.DESCRIPTION:
		case ChunkType.EXPLANATION:
		case ChunkType.CLOSING:
		case ChunkType.INFO:
			return format === 'markdown' ? 'markdown' : 'text';

		// Data display
		case ChunkType.TABLE:
		case ChunkType.TWO_COLUMN_TABLE:
			return 'table';
		case ChunkType.LIST:
		case ChunkType.SUMMARY:
		case ChunkType.NEXT_STEPS:
			return 'list';
		case ChunkType.CODE:
			return 'code';
		case ChunkType.JSON_VIEW:
			return 'json';

		// Interactive elements
		case ChunkType.BUTTON:
		case ChunkType.BUTTON_GROUP:
			return 'button';
		case ChunkType.DROPDOWN:
			return 'dropdown';
		case ChunkType.RADIO:
		case ChunkType.CHECKBOX:
			return 'radioButton';
		case ChunkType.FORM:
			return 'form';
		case ChunkType.LINK:
			return 'link';

		// Input elements
		case ChunkType.DATE_PICKER:
			return 'datePicker';
		case ChunkType.COLOR_PICKER:
			return 'colorPicker';
		case ChunkType.FILE_UPLOADER:
			return 'fileUploader';
		case ChunkType.SLIDER:
			return 'slider';
		case ChunkType.TOGGLE:
			return 'toggleSwitch';

		// Status
		case ChunkType.PROGRESS:
			return 'progressBar';
		case ChunkType.ERROR:
		case ChunkType.SUCCESS:
		case ChunkType.WARNING:
			return format === 'markdown' ? 'markdown' : 'text';

		default:
			return format === 'markdown' ? 'markdown' : 'text';
	}
}

/**
 * Accumulate blocks from multiple chunks into a structured response
 */
export function accumulateBlocks(existingBlocks: LLMUIBlock[], newBlock: LLMUIBlock): LLMUIBlock[] {
	return [...existingBlocks, newBlock];
}
