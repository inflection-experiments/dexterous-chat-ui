<script lang="ts">
	import type { ButtonElement } from '$lib/types/structuredResponse';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';
	import Icon from '@iconify/svelte';

	let {
		element,
		messageId,
		onClick
	}: {
		element: ButtonElement;
		messageId: number | string;
		onClick: (button: any, messageId: number | string) => void;
	} = $props();

	const buttonClasses = {
		primary:
			'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]',
		secondary: 'border border-white/20 bg-white/10 backdrop-blur-sm hover:bg-white/20',
		danger: 'bg-red-600 hover:bg-red-700 shadow-[0_4px_12px_rgba(220,38,38,0.3)]'
	};
</script>

<button
	class="rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl {buttonClasses[element.variant || 'primary']}"
	onclick={() => onClick(element, messageId)}
>
	{#if element.icon}
		<span class="mr-2">{element.icon}</span>
	{/if}
	{@html parseInlineFormatting(element.label)}
</button>



