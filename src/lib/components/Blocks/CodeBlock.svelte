<script lang="ts">
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
	<pre class="overflow-x-auto bg-[#0a0a1a] p-4"><code class="font-mono text-sm text-[#ff6b35]"
			>{content}</code
		></pre>
</div>
