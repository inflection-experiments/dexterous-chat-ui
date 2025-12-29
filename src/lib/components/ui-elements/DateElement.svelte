<script lang="ts">
	import type { DateElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: DateElement;
		messageId: number | string;
		onChange: (element: any, value: string, messageId: number | string) => void;
	} = $props();

	let value = $state('');

	const inputType = element.type === 'datetime' ? 'datetime-local' : element.type;
</script>

<div class="flex flex-col gap-2">
	<label class="text-sm font-medium text-white/90">{element.label}</label>
	<input
		type={inputType}
		bind:value
		class="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:border-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50"
		onchange={() => onChange(element, value, messageId)}
	/>
</div>



