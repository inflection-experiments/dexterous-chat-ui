<script lang="ts">
	import type { ListSection } from '$lib/types/structuredResponse';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';

	let {
		section,
		messageId,
		blockIndex = 0,
		onDeleteItem
	}: {
		section: ListSection;
		messageId: number | string;
		blockIndex?: number;
		onDeleteItem?: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
	} = $props();
</script>

<div class="my-3 space-y-2">
	{#if section.variant === 'ordered'}
		<ol class="space-y-2 list-decimal list-inside">
			{#each section.items as item, itemIndex}
				<li class="text-white/90">
					{@html parseInlineFormatting(item.text)}
				</li>
			{/each}
		</ol>
	{:else if section.variant === 'checklist'}
		<ul class="space-y-2">
			{#each section.items as item, itemIndex}
				<li class="flex items-start gap-3">
					<input
						type="checkbox"
						checked={item.checked}
						class="mt-1.5 h-4 w-4 rounded border-white/20 bg-white/10 text-[#ff6b35] focus:ring-[#ff6b35]"
						readonly
					/>
					<span class="flex-1 text-white/90">
						{@html parseInlineFormatting(item.text)}
					</span>
				</li>
			{/each}
		</ul>
	{:else}
		<ul class="space-y-2">
			{#each section.items as item, itemIndex}
				<li class="flex items-start gap-3">
					<span class="mt-1.5 text-[#ff6b35]">◆</span>
					<span class="flex-1 text-white/90">{@html parseInlineFormatting(item.text)}</span>
				</li>
			{/each}
		</ul>
	{/if}
</div>



