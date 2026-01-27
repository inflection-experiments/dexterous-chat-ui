<script lang="ts">
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
			</li>
		{/each}
	</ul>
</div>
