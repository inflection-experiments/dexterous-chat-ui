<script lang="ts">
	import type { StructuredResponse } from '$lib/types/structuredResponse';
	import type { LLMUIBlock } from '$lib/types/llmUIResponse';
	import MarkdownSection from '$lib/components/sections/MarkdownSection.svelte';
	import CodeSection from '$lib/components/sections/CodeSection.svelte';
	import TableSection from '$lib/components/sections/TableSection.svelte';
	import ListSection from '$lib/components/sections/ListSection.svelte';
	import { parseMarkdown } from '$lib/utils/markdownParser';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';
	import ButtonElement from '$lib/components/ui-elements/ButtonElement.svelte';

	let {
		structuredResponse,
		messageId,
		blockIndex = 0,
		selectionState,
		onButtonAction,
		onDeleteRow,
		onDeleteItem,
		onSaveSelected
	}: {
		structuredResponse: StructuredResponse;
		messageId: number | string;
		blockIndex?: number;
		selectionState?: any;
		onButtonAction?: (button: any, messageId: number | string) => void;
		onDeleteRow?: (messageId: number | string, blockIndex: number, rowIndex: number) => void;
		onDeleteItem?: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
		onSaveSelected?: () => void;
	} = $props();

	/**
	 * Convert LLMUIBlock to section format for existing components
	 */
	function convertBlockToSection(block: LLMUIBlock, idx: number): any {
		switch (block.renderType) {
			case 'text':
			case 'markdown':
				// Both text and markdown render as markdown section
				return {
					type: 'markdown',
					content: typeof block.content === 'string' ? block.content : String(block.content)
				};
			case 'table':
				if (Array.isArray(block.content) && block.content.length > 0) {
					const headers = Object.keys(block.content[0]);
					const rows = block.content.map((row: any) => headers.map((h) => String(row[h] || '')));
					return { type: 'table', headers, rows };
				}
				return null;
			case 'list':
				if (Array.isArray(block.content)) {
					const items = block.content.map((item: any) => ({
						text: item.text || item.label || String(item),
						checked: item.checked || false
					}));
					return { type: 'list', variant: 'unordered', items };
				}
				return null;
			case 'code':
				return {
					type: 'code',
					language: 'text',
					code: typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)
				};
			case 'json':
				return {
					type: 'code',
					language: 'json',
					code: JSON.stringify(block.content, null, 2)
				};
			default:
				return null;
		}
	}
</script>

<div class="mb-2 text-[0.95rem] leading-[1.7] text-white">
	<!-- Render blocks -->
	{#each structuredResponse.blocks as block, idx}
		{@const section = convertBlockToSection(block, idx)}
		{#if section}
			{#if section.type === 'markdown'}
				<MarkdownSection
					section={section}
					{messageId}
					blockIndex={blockIndex + idx}
					{selectionState}
					{onButtonAction}
					{onDeleteRow}
					{onDeleteItem}
					{onSaveSelected}
				/>
			{:else if section.type === 'code'}
				<CodeSection section={section} />
			{:else if section.type === 'table'}
				<TableSection
					section={section}
					{messageId}
					blockIndex={blockIndex + idx}
					{selectionState}
					{onDeleteRow}
					{onSaveSelected}
				/>
			{:else if section.type === 'list'}
				<ListSection
					section={section}
					{messageId}
					blockIndex={blockIndex + idx}
					{onDeleteItem}
				/>
			{/if}
		{/if}
	{/each}
</div>

