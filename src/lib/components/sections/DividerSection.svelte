<script lang="ts">
	import type { DividerSection } from '$lib/types/structuredResponse';

	let { section }: { section: DividerSection } = $props();
</script>

{#if section.label}
	<div class="my-4 flex items-center gap-3">
		<hr class="flex-1 border-t border-white/20" />
		<span class="text-sm text-white/60">{section.label}</span>
		<hr class="flex-1 border-t border-white/20" />
	</div>
{:else}
	<hr class="my-4 border-t border-white/20" />
{/if}

