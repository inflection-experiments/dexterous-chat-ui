<script lang="ts">
	import type { SliderElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: SliderElement;
		messageId: number | string;
		onChange: (element: any, value: number, messageId: number | string) => void;
	} = $props();

	let value = $state(element.min);
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between">
		<label class="text-sm font-medium text-white/90">{element.label}</label>
		<span class="text-sm text-white/70">{value}</span>
	</div>
	<input
		type="range"
		min={element.min}
		max={element.max}
		bind:value
		class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-white/10 accent-[#ff6b35]"
		oninput={() => onChange(element, value, messageId)}
	/>
</div>



