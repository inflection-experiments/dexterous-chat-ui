<script lang="ts">
	import type { McpToolName } from '$lib/types/mcp.types';
	import { MCP_TOOL_CONFIGS } from '$lib/utils/mcpFormState';
	import Icon from '@iconify/svelte';

	let {
		selectedTool,
		onSelect
	}: {
		selectedTool: McpToolName;
		onSelect: (tool: McpToolName) => void;
	} = $props();

	const toolIcons: Record<McpToolName, string> = {
		define_entities: 'mdi:shape-plus',
		get_conversation_history: 'mdi:history',
		search_conversations: 'mdi:magnify',
		get_project_context: 'mdi:folder-information',
		get_cache_summary: 'mdi:cached'
	};

	const selectedConfig = $derived(MCP_TOOL_CONFIGS.find((t) => t.name === selectedTool));
</script>

<div>
	<div class="flex flex-wrap gap-2">
		{#each MCP_TOOL_CONFIGS as tool (tool.name)}
			<button
				onclick={() => onSelect(tool.name)}
				class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200
					{selectedTool === tool.name
					? 'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]'
					: 'border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90'}"
			>
				<Icon icon={toolIcons[tool.name]} width="18" height="18" />
				<span>{tool.displayName}</span>
			</button>
		{/each}
	</div>

	{#if selectedConfig}
		<p class="mt-3 text-sm text-white/50">{selectedConfig.description}</p>
	{/if}
</div>
