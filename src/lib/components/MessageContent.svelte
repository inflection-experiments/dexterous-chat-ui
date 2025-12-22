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
		onDeleteRow: (messageId: number | string, blockIndex: number, rowIndex: number) => void;
		onDeleteItem: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
		onSaveSelected: () => void;
	} = $props();
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
