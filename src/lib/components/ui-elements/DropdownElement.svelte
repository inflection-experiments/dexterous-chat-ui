<script lang="ts">
	import type { DropdownElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: DropdownElement;
		messageId: number | string;
		onChange: (element: any, value: string, messageId: number | string) => void;
	} = $props();

	let selectedValue = $state('');
</script>

<div class="flex flex-col gap-2">
	{#if element.label}
		<label class="text-sm font-medium text-white/90">{element.label}</label>
	{/if}
	<select
		class="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:border-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50"
		bind:value={selectedValue}
		onchange={() => onChange(element, selectedValue, messageId)}
	>
		{#if element.placeholder}
			<option value="" disabled>{element.placeholder}</option>
		{/if}
		{#each element.options as option}
			<option value={option.value} class="bg-[#1a1a2e] text-white">
				{option.label}
			</option>
		{/each}
	</select>
	{#each element.options as option}
		{#if option.description && selectedValue === option.value}
			<p class="text-xs text-white/60">{option.description}</p>
		{/if}
	{/each}
</div>



