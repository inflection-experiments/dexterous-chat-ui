<script lang="ts">
	import type { DefinitionContentItem } from '$lib/types/mcp.types';
	import CodeBlock from '$lib/components/blocks/CodeBlock.svelte';

	let {
		blocks
	}: {
		blocks: DefinitionContentItem[];
	} = $props();

	const getContentString = (content: any): string => {
		if (typeof content === 'string') return content;
		return JSON.stringify(content, null, 2);
	};

	const isCodeLike = (block: DefinitionContentItem): boolean => {
		const type = (block.type || '').toLowerCase();
		const renderType = (block.renderType || '').toLowerCase();
		return (
			type === 'code' ||
			type === 'json' ||
			renderType === 'code' ||
			renderType === 'json'
		);
	};
</script>

<div class="space-y-3">
	<h4 class="text-sm font-semibold text-white/90">Content Blocks</h4>

	{#each blocks as block, idx (idx)}
		<div class="animate-[fadeInUp_0.3s_ease-out]" style="animation-delay: {idx * 50}ms">
			{#if isCodeLike(block)}
				<CodeBlock
					language={block.dataType || block.type || 'json'}
					content={getContentString(block.content)}
				/>
			{:else if typeof block.content === 'string'}
				<div class="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
					<p class="text-sm leading-relaxed text-white/90">{block.content}</p>
					{#if block.type}
						<span class="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-xs text-white/40">
							{block.type}
						</span>
					{/if}
				</div>
			{:else}
				<CodeBlock
					language="json"
					content={JSON.stringify(block.content, null, 2)}
				/>
			{/if}
		</div>
	{/each}

	{#if blocks.length === 0}
		<p class="py-2 text-center text-sm text-white/40">No content blocks.</p>
	{/if}
</div>
