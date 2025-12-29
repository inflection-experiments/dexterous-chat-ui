<script lang="ts">
	import type { SummarySection } from '$lib/types/structuredResponse';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';

	let { section }: { section: SummarySection } = $props();
</script>

<div class="my-4 rounded-lg border border-white/20 bg-white/5 p-4">
	<div class="grid gap-3">
		{#each section.items as item}
			<div class="flex items-center gap-3">
				{#if item.icon}
					<span class="text-xl">{item.icon}</span>
				{/if}
				<span class="text-sm font-medium text-white/70">{item.label}:</span>
				<span class="text-sm font-semibold text-white">
					{@html parseInlineFormatting(String(item.value))}
				</span>
			</div>
		{/each}
	</div>
</div>

