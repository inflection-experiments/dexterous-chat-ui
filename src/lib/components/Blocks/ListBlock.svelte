<script lang="ts">
    // lib/components/blocks/ListBlock.svelte
	import Icon from '@iconify/svelte';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';

	let {
		items,
		messageId,
		blockIndex,
		onDelete
	}: {
		items: any[];
		messageId: number | string;
		blockIndex: number;
		onDelete: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
	} = $props();
</script>

<div class="my-3 space-y-2">
	<ul class="space-y-2">
		{#each items as item, itemIndex}
			<li class="group/item flex items-start gap-3" style="padding-left: {item.indent * 1.5}rem">
				<span class="mt-1.5 text-[#ff6b35]">◆</span>
				<span class="flex-1 text-white/90">{@html parseInlineFormatting(item.text)}</span>
				<button
					class="ml-2 rounded bg-white/10 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity group-hover/item:opacity-100 hover:bg-red-500/20 hover:text-red-400"
					onclick={() => onDelete(messageId, blockIndex, itemIndex)}
					title="Delete item"
				>
					<Icon icon="mdi:close" width="14" height="14" />
				</button>
			</li>
		{/each}
	</ul>
</div>