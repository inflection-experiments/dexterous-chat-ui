<script lang="ts">
	import Icon from '@iconify/svelte';

	let {
		status,
		isChecking,
		lastChecked,
		onRefresh
	}: {
		status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
		isChecking: boolean;
		lastChecked: string | null;
		onRefresh: () => void;
	} = $props();

	const statusConfig = $derived(
		(() => {
			switch (status) {
				case 'healthy':
					return { color: 'bg-green-500', text: 'Healthy', textColor: 'text-green-400' };
				case 'degraded':
					return { color: 'bg-yellow-500', text: 'Degraded', textColor: 'text-yellow-400' };
				case 'unhealthy':
					return { color: 'bg-red-500', text: 'Unhealthy', textColor: 'text-red-400' };
				default:
					return { color: 'bg-gray-500', text: 'Unknown', textColor: 'text-gray-400' };
			}
		})()
	);

	const formattedTime = $derived(
		lastChecked ? new Date(lastChecked).toLocaleTimeString() : null
	);
</script>

<div class="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 backdrop-blur-sm">
	<div class="flex items-center gap-2">
		<div
			class="h-2.5 w-2.5 rounded-full {statusConfig.color} {isChecking ? 'animate-pulse' : ''}"
		></div>
		<span class="text-xs font-medium {statusConfig.textColor}">
			MCP: {isChecking ? 'Checking...' : statusConfig.text}
		</span>
	</div>

	{#if formattedTime}
		<span class="text-xs text-white/40">{formattedTime}</span>
	{/if}

	<button
		onclick={onRefresh}
		disabled={isChecking}
		class="rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
		title="Refresh health status"
	>
		<Icon icon="mdi:refresh" width="16" height="16" class={isChecking ? 'animate-spin' : ''} />
	</button>
</div>
