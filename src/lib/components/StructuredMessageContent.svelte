<script lang="ts">
	import type { StructuredResponse, LLMUIBlock } from '$lib/types/chat';
	import { parseMarkdown } from '$lib/utils/markdownParser';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';
	import { stripMarkdownCodeBlock } from '$lib/utils/ChatUtils';
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
		onDownload,
		onDeleteRow,
		onDeleteItem,
		onSaveSelected,
		onDropdownChange,
		onRadioChange
	}: {
		structuredResponse: StructuredResponse;
		messageId: number | string;
		blockIndex?: number;
		selectionState?: any;
		onButtonAction?: (button: any, messageId: number | string) => void;
		onDownload?: (url: string, fileName: string) => void;
		onDeleteRow?: (messageId: number | string, blockIndex: number, rowIndex: number, rowData: Record<string, string>, entityType: string) => void;
		onDeleteItem?: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
		onSaveSelected?: (messageId: number | string, blockIndex: number, entityType: string) => void;
		onDropdownChange?: (dropdown: any, selectedValue: string, messageId: number | string) => void;
		onRadioChange?: (radioGroup: any, selectedValue: string, messageId: number | string) => void;
	} = $props();

	/**
	 * Detect entity type from table headers
	 */
	function detectEntityType(headers: string[]): string {
		const joined = headers.join(' ').toLowerCase();
		if (joined.includes('service')) return 'service';
		if (joined.includes('model')) return 'model';
		if (joined.includes('column')) return 'column';
		return 'service';
	}

	/**
	 * Convert LLMUIBlock to block format for existing components
	 */
	function convertBlockToParsedBlock(block: LLMUIBlock): any {
		switch (block.renderType) {
			case 'text':
			case 'markdown':
				// Parse markdown content into blocks
				// Strip markdown code block wrappers (```markdown ... ```) that LLMs sometimes add
				let content = typeof block.content === 'string' ? block.content : String(block.content);
				content = stripMarkdownCodeBlock(content);
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
			case 'code': {
				const codeContent = typeof block.content === 'string' ? block.content : JSON.stringify(block.content, null, 2);
				// Check if "code" block is actually markdown wrapped in ```markdown/md fences
				// Only strip markdown-specific fences, not generic code fences (e.g. ```python)
				const mdFenceMatch = codeContent.trim().match(/^```\s*(?:markdown|md)\s*\n([\s\S]*?)\n\s*```\s*$/);
				if (mdFenceMatch && mdFenceMatch[1]) {
					// Content was wrapped in markdown fences - render as markdown, not code
					return parseMarkdown(mdFenceMatch[1].trim());
				}
				return [{
					type: 'code',
					language: 'text',
					content: codeContent
				}];
			}
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
			{:else if parsedBlock.type === 'h4'}
				<h4 class="mt-3 mb-1.5 text-base font-semibold text-white first:mt-0">
					{@html parseInlineFormatting(parsedBlock.content)}
				</h4>
			{:else if parsedBlock.type === 'h5'}
				<h5 class="mt-2 mb-1 text-sm font-semibold text-white/90 first:mt-0">
					{@html parseInlineFormatting(parsedBlock.content)}
				</h5>
			{:else if parsedBlock.type === 'h6'}
				<h6 class="mt-2 mb-1 text-sm font-medium text-white/80 first:mt-0">
					{@html parseInlineFormatting(parsedBlock.content)}
				</h6>
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
					entityType={detectEntityType(parsedBlock.content.headers || [])}
					onDeleteRow={onDeleteRow || ((_m, _b, _r, _d, _e) => {})}
					onSaveSelected={onSaveSelected || ((_m, _b, _e) => {})}
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
							className: parsedBlock.content.Action === 'reject' ? 'btn-secondary' : 'btn-primary',
							action: parsedBlock.content.Action,
							entityType: parsedBlock.content.EntityType || 'service',
							operation: parsedBlock.content.Operation || '',
							payload: parsedBlock.content
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
						onChange={onDropdownChange}
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
						onChange={onRadioChange}
					/>
				{/if}
			{:else if parsedBlock.type === 'link'}
				{#if typeof parsedBlock.content === 'object' && 'URL' in parsedBlock.content}
					{@const isDownload = parsedBlock.content.Action === 'download'}
					{#if isDownload && onDownload}
						<!-- Download link: use fetch with auth headers via callback -->
						<button
							type="button"
							onclick={() => onDownload(parsedBlock.content.URL, parsedBlock.content.Label || 'config.json')}
							class="my-2 inline-flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[#ff6b35] hover:text-[#f7931e] transition-colors text-[0.95rem]"
						>
							<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
							</svg>
							{parsedBlock.content.Label || parsedBlock.content.URL}
						</button>
					{:else}
						<!-- Regular link: open in new tab -->
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
