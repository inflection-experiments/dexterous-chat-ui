<script lang="ts">
	import type { CheckboxGroupElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: CheckboxGroupElement;
		messageId: number | string;
		onChange: (element: any, values: string[], messageId: number | string) => void;
	} = $props();

	let selectedValues = $state<string[]>([]);

	function handleChange(value: string, checked: boolean) {
		if (checked) {
			selectedValues = [...selectedValues, value];
		} else {
			selectedValues = selectedValues.filter((v) => v !== value);
		}
		onChange(element, selectedValues, messageId);
	}
</script>

<div class="flex flex-col gap-3">
	{#if element.label}
		<label class="text-sm font-medium text-white/90">{element.label}</label>
	{/if}
	<div class="space-y-2">
		{#each element.options as option}
			<label class="flex items-start gap-3 cursor-pointer">
				<input
					type="checkbox"
					value={option.value}
					checked={selectedValues.includes(option.value)}
					class="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-[#ff6b35] focus:ring-[#ff6b35]"
					onchange={(e) => handleChange(option.value, e.currentTarget.checked)}
				/>
				<div class="text-sm text-white/90">{option.label}</div>
			</label>
		{/each}
	</div>
</div>



