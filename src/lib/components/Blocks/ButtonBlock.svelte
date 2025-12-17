<script lang="ts">
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
</div>