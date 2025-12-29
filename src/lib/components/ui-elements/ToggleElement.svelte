<script lang="ts">
	import type { ToggleElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: ToggleElement;
		messageId: number | string;
		onChange: (element: any, value: boolean, messageId: number | string) => void;
	} = $props();

	let checked = $state(false);
</script>

<div class="flex items-center gap-3">
	<label class="text-sm font-medium text-white/90">{element.label}</label>
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors {checked
			? 'bg-[#ff6b35]'
			: 'bg-white/20'}"
		onclick={() => {
			checked = !checked;
			onChange(element, checked, messageId);
		}}
	>
		<span
			class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {checked
				? 'translate-x-6'
				: 'translate-x-1'}"
		></span>
	</button>
</div>



