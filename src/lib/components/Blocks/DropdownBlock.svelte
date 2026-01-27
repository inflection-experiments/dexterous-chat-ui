<script lang="ts">
	import type { Dropdown } from '$lib/utils/markdownParser';
	import Icon from '@iconify/svelte';

	let {
		dropdowns,
		messageId,
		onChange
	}: {
		dropdowns: Dropdown[];
		messageId: number | string;
		onChange?: (dropdown: Dropdown, selectedValue: string, messageId: number | string) => void;
	} = $props();

	const handleChange = (dropdown: Dropdown, value: string) => {
		if (onChange) {
			onChange(dropdown, value, messageId);
		}
	};
</script>

<div class="my-4 space-y-4">
	{#each dropdowns as dropdown}
		<div class="flex flex-col gap-2">
			{#if dropdown.label}
				<label class="text-sm font-semibold text-white/90">{dropdown.label}</label>
			{/if}
			<div class="relative">
				<select
					class="w-full appearance-none rounded-lg border border-white/20 bg-white/10 px-4 py-3 pr-10 text-sm text-white backdrop-blur-sm transition-all duration-200 focus:border-[#ff6b35] focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50 hover:bg-white/15"
					name={dropdown.name}
					onchange={(e) => handleChange(dropdown, (e.target as HTMLSelectElement).value)}
				>
					{#if dropdown.placeholder}
						<option value="" disabled selected={!dropdown.options.some((opt) => opt.selected)}>
							{dropdown.placeholder}
						</option>
					{/if}
					{#each dropdown.options as option}
						<option value={option.value} selected={option.selected}>
							{option.label}
						</option>
					{/each}
				</select>
				<div
					class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/60"
				>
					<Icon icon="mdi:chevron-down" width="20" height="20" />
				</div>
			</div>
		</div>
	{/each}
</div>

<style>
	select option {
		background-color: #1a1a1a;
		color: white;
	}
</style>

