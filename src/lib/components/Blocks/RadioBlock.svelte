<script lang="ts">
	import type { RadioGroup } from '$lib/utils/markdownParser';
	import Icon from '@iconify/svelte';

	let {
		radioGroups,
		messageId,
		onChange
	}: {
		radioGroups: RadioGroup[];
		messageId: number | string;
		onChange?: (radioGroup: RadioGroup, selectedValue: string, messageId: number | string) => void;
	} = $props();

	let selectedValues = $state<Map<string, string>>(new Map());

	// Initialize selected values from checked options
	$effect(() => {
		radioGroups.forEach((group) => {
			const checkedOption = group.options.find((opt) => opt.checked);
			if (checkedOption) {
				selectedValues.set(group.name, checkedOption.value);
			}
		});
	});

	const handleChange = (group: RadioGroup, value: string) => {
		selectedValues.set(group.name, value);
		if (onChange) {
			onChange(group, value, messageId);
		}
	};
</script>

<div class="my-4 space-y-6">
	{#each radioGroups as group}
		<div class="flex flex-col gap-3">
			{#if group.label}
				<label class="text-sm font-semibold text-white/90">{group.label}</label>
			{/if}
			<div class="space-y-3">
				{#each group.options as option}
					<label
						class="group flex cursor-pointer items-start gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 transition-all duration-200 hover:border-[#ff6b35]/50 hover:bg-white/10 {selectedValues.get(group.name) ===
						option.value
							? 'border-[#ff6b35] bg-[#ff6b35]/10'
							: ''}"
					>
						<div class="relative mt-0.5 flex-shrink-0">
							<input
								type="radio"
								name={group.name}
								value={option.value}
								checked={selectedValues.get(group.name) === option.value}
								onchange={() => handleChange(group, option.value)}
								class="peer h-5 w-5 cursor-pointer appearance-none rounded-full border-2 border-white/30 bg-white/10 transition-all duration-200 checked:border-[#ff6b35] checked:bg-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50"
							/>
							<div
								class="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-0 transition-opacity peer-checked:opacity-100"
							></div>
						</div>
						<div class="flex-1 text-sm text-white/90 leading-relaxed">
							{option.label}
						</div>
					</label>
				{/each}
			</div>
		</div>
	{/each}
</div>

