<script lang="ts">
	import type { StructuredResponse, LLMUIBlock } from '$lib/types/chat';
	import { parseMarkdown } from '$lib/utils/markdownParser';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';
	import DropdownBlock from '$lib/components/Blocks/DropdownBlock.svelte';
	import RadioBlock from '$lib/components/Blocks/RadioBlock.svelte';
	import ButtonBlock from './blocks/ButtonBlock.svelte';
	import CodeBlock from './blocks/CodeBlock.svelte';
	import ListBlock from './blocks/ListBlock.svelte';
	import TableBlock from './blocks/TableBlock.svelte';

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
	 * Convert LLMUIBlock to block format for existing components
	 */
	function convertBlockToParsedBlock(block: LLMUIBlock): any {
		switch (block.renderType) {
			case 'text':
			case 'markdown':
				// Parse markdown content into blocks
				const content = typeof block.content === 'string' ? block.content : String(block.content);
				return parseMarkdown(content);
			case 'table':
				if (Array.isArray(block.content) && block.content.length > 0) {
					let headers = Object.keys(block.content[0]);
					
					// Reorder headers: Service Name should come before Status
					const serviceNameIndex = headers.indexOf('Service Name');
					const statusIndex = headers.indexOf('Status');
					
					if (serviceNameIndex !== -1 && statusIndex !== -1 && serviceNameIndex > statusIndex) {
						// Remove Service Name from its current position
						headers = headers.filter((_, idx) => idx !== serviceNameIndex);
						// Insert Service Name before Status
						const newStatusIndex = headers.indexOf('Status');
						headers.splice(newStatusIndex, 0, 'Service Name');
					}
					
					const rows = block.content.map((row: any) => headers.map((h) => String(row[h] || '')));
					return [{
						type: 'table',
						content: { headers, rows }
					}];
				}
				return [];
			case 'list':
				if (Array.isArray(block.content)) {
					const items = block.content.map((item: any) => ({
						text: item.text || item.label || String(item),
						indent: 0
					}));
					return [{
						type: 'list',
						content: items
					}];
				}
				return [];
			case 'code':
				return [{
					type: 'code',
					language: 'text',
					content: typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2)
				}];
			case 'json':
				return [{
					type: 'code',
					language: 'json',
					content: JSON.stringify(block.content, null, 2)
				}];
			// Interactive UI elements - return special block types
			case 'button':
			case 'dropdown':
			case 'radioButton':
			case 'link':
			case 'form':
			case 'datePicker':
			case 'colorPicker':
			case 'fileUploader':
			case 'progressBar':
			case 'toggleSwitch':
			case 'slider':
				return [{
					type: block.renderType,
					content: block.content
				}];
			default:
				return [];
		}
	}
</script>

<div class="mb-2 text-[0.95rem] leading-[1.7] text-white">
	<!-- Render blocks - keyed for streaming animation -->
	{#each structuredResponse.blocks as block, idx (idx)}
		{@const parsedBlocks = convertBlockToParsedBlock(block)}
		{#each parsedBlocks as parsedBlock, pIdx (`${idx}-${pIdx}`)}
			<div class="block-appear" style="animation-delay: {idx * 50}ms">
			{#if parsedBlock.type === 'h1'}
				<h1 class="mt-4 mb-3 border-b-2 border-[#ff6b35] pb-2 text-2xl font-bold text-white first:mt-0">
					{@html parseInlineFormatting(parsedBlock.content)}
				</h1>
			{:else if parsedBlock.type === 'h2'}
				<h2 class="mt-4 mb-2 text-xl font-semibold text-white first:mt-0">
					{@html parseInlineFormatting(parsedBlock.content)}
				</h2>
			{:else if parsedBlock.type === 'h3'}
				<h3 class="mt-3 mb-2 text-lg font-semibold text-white first:mt-0">
					{@html parseInlineFormatting(parsedBlock.content)}
				</h3>
			{:else if parsedBlock.type === 'hr'}
				<hr class="my-4 border-t border-white/20" />
			{:else if parsedBlock.type === 'code'}
				<CodeBlock language={parsedBlock.language} content={parsedBlock.content} />
			{:else if parsedBlock.type === 'table'}
				<TableBlock
					block={parsedBlock}
					{messageId}
					blockIndex={blockIndex + idx}
					{selectionState}
					onDeleteRow={onDeleteRow || (() => {})}
					onSaveSelected={onSaveSelected || (() => {})}
				/>
			{:else if parsedBlock.type === 'list'}
				<ListBlock
					items={parsedBlock.content}
					{messageId}
					blockIndex={blockIndex + idx}
					onDelete={onDeleteItem || (() => {})}
				/>
			{:else if parsedBlock.type === 'button'}
				{#if typeof parsedBlock.content === 'object' && 'UIElement' in parsedBlock.content}
					<ButtonBlock
						buttons={[{
							text: parsedBlock.content.Label || 'Button',
							className: 'btn-primary',
							action: parsedBlock.content.Action
						}]}
						{messageId}
						onClick={onButtonAction || (() => {})}
					/>
				{/if}
			{:else if parsedBlock.type === 'dropdown'}
				{#if typeof parsedBlock.content === 'object' && 'UIElement' in parsedBlock.content && 'Options' in parsedBlock.content}
					<DropdownBlock
						dropdowns={[{
							name: parsedBlock.content.id || 'dropdown',
							label: parsedBlock.content.Label || '',
							options: parsedBlock.content.Options.map((opt: any) => ({
								label: opt.label,
								value: opt.value,
								selected: false
							})),
							placeholder: 'Select an option'
						}]}
						{messageId}
					/>
				{/if}
			{:else if parsedBlock.type === 'radioButton'}
				{#if typeof parsedBlock.content === 'object' && 'UIElement' in parsedBlock.content && 'Options' in parsedBlock.content}
					<RadioBlock
						radioGroups={[{
							name: parsedBlock.content.id || 'radio',
							label: parsedBlock.content.Label || '',
							options: parsedBlock.content.Options.map((opt: any) => ({
								label: opt.Label,
								value: opt.Value,
								checked: false
							}))
						}]}
						{messageId}
					/>
				{/if}
			{:else if parsedBlock.type === 'link'}
				{#if typeof parsedBlock.content === 'object' && 'URL' in parsedBlock.content}
					<a
						href={parsedBlock.content.URL}
						target="_blank"
						rel="noopener noreferrer"
						class="my-2 inline-flex items-center gap-2 text-[#ff6b35] hover:text-[#f7931e] transition-colors"
					>
						{parsedBlock.content.Label || parsedBlock.content.URL}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
						</svg>
					</a>
				{/if}
			{:else if parsedBlock.type === 'json' || (parsedBlock.type === 'form') || (parsedBlock.type === 'datePicker') || (parsedBlock.type === 'colorPicker') || (parsedBlock.type === 'fileUploader') || (parsedBlock.type === 'progressBar') || (parsedBlock.type === 'toggleSwitch') || (parsedBlock.type === 'slider')}
				<!-- Render unsupported UI elements as JSON for now -->
				<CodeBlock
					language="json"
					content={JSON.stringify(parsedBlock.content, null, 2)}
				/>
			{:else if parsedBlock.type === 'p'}
				<p class="my-2 leading-relaxed text-white/90">
					{@html parseInlineFormatting(parsedBlock.content)}
				</p>
			{/if}
			</div>
		{/each}
	{/each}
</div>

<style>
	@keyframes blockAppear {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.block-appear {
		animation: blockAppear 0.3s ease-out forwards;
		opacity: 0;
	}
</style>

