<script lang="ts">
	import type { AlertSection } from '$lib/types/structuredResponse';
	import Icon from '@iconify/svelte';

	let { section }: { section: AlertSection } = $props();

	const alertClasses = {
		success: 'border-green-500/50 bg-green-500/10 text-green-400',
		warning: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400',
		error: 'border-red-500/50 bg-red-500/10 text-red-400',
		info: 'border-blue-500/50 bg-blue-500/10 text-blue-400'
	};

	const icons = {
		success: 'mdi:check-circle',
		warning: 'mdi:alert',
		error: 'mdi:alert-circle',
		info: 'mdi:information'
	};
</script>

<div class="my-4 rounded-lg border p-4 {alertClasses[section.variant]}">
	<div class="flex items-start gap-3">
		<Icon icon={icons[section.variant]} width="20" height="20" class="mt-0.5 flex-shrink-0" />
		<div class="flex-1">
			{#if section.title}
				<div class="mb-1 font-semibold">{section.title}</div>
			{/if}
			<div class="text-sm">{section.message}</div>
		</div>
	</div>
</div>



