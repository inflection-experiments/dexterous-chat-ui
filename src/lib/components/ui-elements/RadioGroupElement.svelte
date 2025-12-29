<script lang="ts">
	import type { RadioGroupElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: RadioGroupElement;
		messageId: number | string;
		onChange: (element: any, value: string, messageId: number | string) => void;
	} = $props();

	let selectedValue = $state('');
</script>

<div class="flex flex-col gap-3">
	{#if element.label}
		<label class="text-sm font-medium text-white/90">{element.label}</label>
	{/if}
	<div class="space-y-2">
		{#each element.options as option}
			<label class="flex items-start gap-3 cursor-pointer">
				<input
					type="radio"
					name={element.id}
					value={option.value}
					bind:group={selectedValue}
					class="mt-1 h-4 w-4 border-white/20 bg-white/10 text-[#ff6b35] focus:ring-[#ff6b35]"
					onchange={() => onChange(element, selectedValue, messageId)}
				/>
				<div class="flex-1">
					<div class="text-sm text-white/90">{option.label}</div>
					{#if option.description}
						<div class="text-xs text-white/60">{option.description}</div>
					{/if}
				</div>
			</label>
		{/each}
	</div>
</div>



