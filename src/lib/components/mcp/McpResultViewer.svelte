<script lang="ts">
	import type {
		McpApiResponse,
		McpToolName,
		DefineEntitiesOutput,
		ConversationHistoryOutput,
		SearchConversationItem,
		ProjectContextOutput
	} from '$lib/types/mcp.types';
	import CodeBlock from '$lib/components/blocks/CodeBlock.svelte';
	import McpEntityTable from './McpEntityTable.svelte';
	import McpContentBlocks from './McpContentBlocks.svelte';
	import Icon from '@iconify/svelte';

	let {
		result,
		toolName,
		duration,
		executedAt
	}: {
		result: McpApiResponse;
		toolName: McpToolName;
		duration: number | null;
		executedAt: string | null;
	} = $props();

	let showRawJson = $state(false);
	let copied = $state(false);

	const isSuccess = $derived(result.Status === 'success');
	const resultJson = $derived(JSON.stringify(result, null, 2));
	const formattedTime = $derived(executedAt ? new Date(executedAt).toLocaleTimeString() : null);

	const copyToClipboard = async () => {
		await navigator.clipboard.writeText(resultJson);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	};

	// Type guards for Data
	const asDefineEntities = $derived(
		toolName === 'define_entities' && isSuccess ? (result.Data as DefineEntitiesOutput) : null
	);
	const asConversationHistory = $derived(
		toolName === 'get_conversation_history' && isSuccess
			? (result.Data as ConversationHistoryOutput)
			: null
	);
	const asSearchConversations = $derived(
		toolName === 'search_conversations' && isSuccess
			? (result.Data as SearchConversationItem[])
			: null
	);
	const asProjectContext = $derived(
		toolName === 'get_project_context' && isSuccess ? (result.Data as ProjectContextOutput) : null
	);
	const asCacheSummary = $derived(
		toolName === 'get_cache_summary' && isSuccess ? result.Data : null
	);
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
	<!-- Header -->
	<div class="mb-5 flex flex-wrap items-center gap-3">
		<span
			class="rounded-full px-3 py-1 text-xs font-semibold
				{isSuccess
				? 'bg-green-500/20 text-green-400'
				: 'bg-red-500/20 text-red-400'}"
		>
			{result.Status}
		</span>

		{#if duration !== null}
			<span class="text-xs text-white/40">{duration}ms</span>
		{/if}

		{#if formattedTime}
			<span class="text-xs text-white/40">{formattedTime}</span>
		{/if}

		<div class="ml-auto flex items-center gap-2">
			<button
				onclick={copyToClipboard}
				class="flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-xs text-white/40 transition-colors hover:text-white"
			>
				<Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} width="14" height="14" />
				{copied ? 'Copied' : 'Copy'}
			</button>

			<button
				onclick={() => (showRawJson = !showRawJson)}
				class="flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors
					{showRawJson
					? 'bg-[#ff6b35]/20 text-[#ff6b35]'
					: 'bg-white/5 text-white/40 hover:text-white'}"
			>
				<Icon icon="mdi:code-json" width="14" height="14" />
				Raw JSON
			</button>
		</div>
	</div>

	<!-- Message -->
	{#if result.Message}
		<p class="mb-4 text-sm text-white/70">{result.Message}</p>
	{/if}

	<!-- Raw JSON view -->
	{#if showRawJson}
		<CodeBlock language="json" content={resultJson} />
	{:else if !isSuccess}
		<!-- Error display -->
		<div class="rounded-lg border border-red-400/30 bg-red-500/10 p-4">
			<div class="flex items-start gap-2">
				<Icon icon="mdi:alert-circle" width="20" height="20" class="mt-0.5 text-red-400" />
				<div>
					<p class="text-sm font-medium text-red-400">Request Failed</p>
					<p class="mt-1 text-sm text-red-300/80">{result.Message || 'Unknown error'}</p>
					{#if result.Data}
						<pre class="mt-2 overflow-x-auto text-xs text-red-300/60">{JSON.stringify(result.Data, null, 2)}</pre>
					{/if}
				</div>
			</div>
		</div>
	{:else if asDefineEntities}
		<!-- define_entities structured view -->
		<div class="space-y-6">
			{#if asDefineEntities.messageId}
				<div class="flex items-center gap-2 text-xs text-white/40">
					<span>Message ID: {asDefineEntities.messageId}</span>
					<span>|</span>
					<span>Conversation: {asDefineEntities.conversationId}</span>
				</div>
			{/if}

			{#if asDefineEntities.content && asDefineEntities.content.length > 0}
				<McpContentBlocks blocks={asDefineEntities.content} />
			{/if}

			{#if asDefineEntities.entities}
				<McpEntityTable entities={asDefineEntities.entities} />
			{/if}

			{#if asDefineEntities.metadata && Object.keys(asDefineEntities.metadata).length > 0}
				<div>
					<h4 class="mb-2 text-sm font-semibold text-white/90">Metadata</h4>
					<CodeBlock language="json" content={JSON.stringify(asDefineEntities.metadata, null, 2)} />
				</div>
			{/if}
		</div>
	{:else if asConversationHistory}
		<!-- get_conversation_history structured view -->
		<div class="space-y-3">
			<div class="flex items-center gap-3 text-xs text-white/40">
				<span>Total: {asConversationHistory.totalCount}</span>
				<span>Has more: {asConversationHistory.hasMore ? 'Yes' : 'No'}</span>
			</div>

			{#if asConversationHistory.messages?.length > 0}
				<div class="space-y-2">
					{#each asConversationHistory.messages as msg, idx (msg.id || idx)}
						<div class="rounded-lg border border-white/10 bg-white/5 p-3">
							<div class="mb-1 flex items-center gap-2">
								<span
									class="rounded px-2 py-0.5 text-xs font-medium
										{msg.role === 'User' || msg.role === 'user'
										? 'bg-[#ff6b35]/20 text-[#ff6b35]'
										: 'bg-blue-500/20 text-blue-400'}"
								>
									{msg.role}
								</span>
								{#if msg.timestamp}
									<span class="text-xs text-white/30">
										{new Date(msg.timestamp).toLocaleString()}
									</span>
								{/if}
								<span class="text-xs text-white/20">{msg.id}</span>
							</div>
							<p class="text-sm text-white/80">
								{typeof msg.content === 'string'
									? msg.content
									: JSON.stringify(msg.content)}
							</p>
						</div>
					{/each}
				</div>
			{:else}
				<p class="py-4 text-center text-sm text-white/40">No messages found.</p>
			{/if}
		</div>
	{:else if asSearchConversations}
		<!-- search_conversations structured view -->
		<div class="space-y-3">
			{#if Array.isArray(asSearchConversations) && asSearchConversations.length > 0}
				<div class="grid grid-cols-1 gap-2">
					{#each asSearchConversations as conv, idx (conv.id || idx)}
						<div
							class="rounded-lg border border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10"
						>
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-white/90">
									{conv.title || conv.id || `Conversation ${idx + 1}`}
								</span>
								{#if conv.createdAt}
									<span class="text-xs text-white/30">
										{new Date(conv.createdAt).toLocaleDateString()}
									</span>
								{/if}
							</div>
							<p class="mt-1 font-mono text-xs text-white/40">{conv.id}</p>
						</div>
					{/each}
				</div>
			{:else}
				<p class="py-4 text-center text-sm text-white/40">No conversations found.</p>
			{/if}
		</div>
	{:else if asProjectContext}
		<!-- get_project_context structured view -->
		<div class="space-y-3">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
				{#each Object.entries(asProjectContext).filter(([k]) => typeof asProjectContext[k] !== 'object') as [key, value]}
					<div class="rounded-lg border border-white/10 bg-white/5 p-3">
						<p class="text-xs font-medium text-white/50">{key}</p>
						<p class="mt-0.5 text-sm text-white/90">{value ?? '-'}</p>
					</div>
				{/each}
			</div>

			{#if asProjectContext.cache}
				<McpEntityTable entities={asProjectContext.cache} />
			{/if}

			{#if asProjectContext.metadata && Object.keys(asProjectContext.metadata).length > 0}
				<div>
					<h4 class="mb-2 text-sm font-semibold text-white/90">Metadata</h4>
					<CodeBlock
						language="json"
						content={JSON.stringify(asProjectContext.metadata, null, 2)}
					/>
				</div>
			{/if}
		</div>
	{:else if asCacheSummary}
		<!-- get_cache_summary structured view -->
		<div class="space-y-3">
			{#if typeof asCacheSummary === 'object'}
				<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{#each Object.entries(asCacheSummary) as [key, value]}
						<div class="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
							<p class="text-xs font-medium text-white/50">{key}</p>
							<p class="mt-1 text-lg font-semibold text-[#ff6b35]">
								{typeof value === 'number'
									? value
									: Array.isArray(value)
										? value.length
										: typeof value === 'object' && value !== null
											? Object.keys(value).length
											: value}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Fallback: render data as JSON -->
		<CodeBlock language="json" content={JSON.stringify(result.Data, null, 2)} />
	{/if}
</div>
