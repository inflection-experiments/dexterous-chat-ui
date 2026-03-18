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
			<li class="group/item flex items-start gap-3">
				<input
					type="checkbox"
					checked={item.checked}
					class="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-[#ff6b35] focus:ring-2 focus:ring-[#ff6b35]"
					disabled
				/>
				<span class={item.checked ? 'flex-1 text-white/50 line-through' : 'flex-1 text-white/90'}>
					{@html parseInlineFormatting(item.text)}
				</span>
			</li>
		{/each}
	</ul>
</div>
