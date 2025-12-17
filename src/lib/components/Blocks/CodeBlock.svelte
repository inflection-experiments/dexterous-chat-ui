<script lang="ts">
    // lib/components/blocks/CodeBlock.svelte
	let { language, content }: { language?: string; content: string } = $props();
</script>

<div class="my-4 overflow-hidden rounded-lg border border-white/20 shadow-sm">
	<div class="flex items-center justify-between bg-[#1a1a2e] px-4 py-2">
		<span class="font-mono text-sm text-white/60">{language || 'code'}</span>
		<button
			class="rounded bg-white/5 px-2 py-1 text-xs text-white/40 transition-colors hover:text-white"
			onclick={() => navigator.clipboard.writeText(content)}
		>
			Copy
		</button>
	</div>
	<pre class="overflow-x-auto bg-[#0a0a1a] p-4"><code class="font-mono text-sm text-[#ff6b35]">{content}</code></pre>
</div>

// lib/components/blocks/ListBlock.svelte
<!-- <script lang="ts">
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
</div> -->

// lib/components/blocks/ChecklistBlock.svelte
<!-- <script lang="ts">
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
</div> -->

// lib/components/blocks/ButtonBlock.svelte
<!-- <script lang="ts">
	import { parseInlineFormatting } from '$lib/utils/markdownParser';

	let {
		buttons,
		messageId,
		onClick
	}: {
		buttons: any[];
		messageId: number | string;
		onClick: (button: any, messageId: number | string) => void;
	} = $props();
</script>

<div class="my-4 flex flex-wrap gap-3">
	{#each buttons as button}
		<button
			class="rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl {button.className === 'btn-primary'
				? 'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]'
				: button.className === 'btn-secondary' || button.className === 'btn-secondaryy'
					? 'border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20'
					: 'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]'}"
			onclick={() => onClick(button, messageId)}
		>
			{@html parseInlineFormatting(button.text)}
		</button>
	{/each}
</div> -->