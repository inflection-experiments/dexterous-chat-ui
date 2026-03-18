<script lang="ts">
	import { parseInlineFormatting } from '$lib/utils/markdownParser';
	import CodeBlock from '$lib/components/blocks/CodeBlock.svelte';
	import TableBlock from '$lib/components/blocks/TableBlock.svelte';
	import ListBlock from '$lib/components/blocks/ListBlock.svelte';
	import ChecklistBlock from '$lib/components/blocks/ChecklistBlock.svelte';
	import ButtonBlock from '$lib/components/blocks/ButtonBlock.svelte';

	let {
		parsedContent,
		messageId,
		selectionState,
		onButtonAction,
		onDeleteRow,
		onDeleteItem,
		onSaveSelected
	}: {
		parsedContent: any[];
		messageId: number | string;
		selectionState: any;
		onButtonAction: (button: any, messageId: number | string) => void;
		onDeleteRow: (messageId: number | string, blockIndex: number, rowIndex: number, rowData: Record<string, string>, entityType: string) => void;
		onDeleteItem: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
		onSaveSelected: (messageId: number | string, blockIndex: number, entityType: string) => void;
	} = $props();

	function detectEntityType(headers: string[]): string {
		const joined = headers.join(' ').toLowerCase();
		if (joined.includes('service')) return 'service';
		if (joined.includes('model')) return 'model';
		if (joined.includes('column')) return 'column';
		return 'service';
	}
</script>

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
		{:else if block.type === 'h4'}
			<h4 class="mt-3 mb-1.5 text-base font-semibold text-white first:mt-0">
				{@html parseInlineFormatting(block.content)}
			</h4>
		{:else if block.type === 'h5'}
			<h5 class="mt-2 mb-1 text-sm font-semibold text-white/90 first:mt-0">
				{@html parseInlineFormatting(block.content)}
			</h5>
		{:else if block.type === 'h6'}
			<h6 class="mt-2 mb-1 text-sm font-medium text-white/80 first:mt-0">
				{@html parseInlineFormatting(block.content)}
			</h6>
		{:else if block.type === 'hr'}
			<hr class="my-4 border-t border-white/20" />
		{:else if block.type === 'code'}
			<CodeBlock language={block.language} content={block.content} />
		{:else if block.type === 'table'}
			<TableBlock
				{block}
				{messageId}
				{blockIndex}
				{selectionState}
				entityType={detectEntityType(block.content?.headers || [])}
				{onDeleteRow}
				{onSaveSelected}
			/>
		{:else if block.type === 'checklist'}
			<ChecklistBlock items={block.content} {messageId} {blockIndex} onDelete={onDeleteItem} />
		{:else if block.type === 'list'}
			<ListBlock items={block.content} {messageId} {blockIndex} onDelete={onDeleteItem} />
		{:else if block.type === 'buttons'}
			<ButtonBlock buttons={block.content} {messageId} onClick={onButtonAction} />
		{:else if block.type === 'p'}
			<p class="my-2 leading-relaxed text-white/90">
				{@html parseInlineFormatting(block.content)}
			</p>
		{/if}
	{/each}
</div>
