<script lang="ts">
	import type { TextareaElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: TextareaElement;
		messageId: number | string;
		onChange: (element: any, value: string, messageId: number | string) => void;
	} = $props();

	let value = $state('');
</script>

<div class="flex flex-col gap-2">
	<label class="text-sm font-medium text-white/90">{element.label}</label>
	<textarea
		bind:value
		placeholder={element.placeholder}
		rows="4"
		class="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder-white/40 backdrop-blur-sm transition-colors hover:bg-white/20 focus:border-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50 resize-y"
		oninput={() => onChange(element, value, messageId)}
	></textarea>
</div>



