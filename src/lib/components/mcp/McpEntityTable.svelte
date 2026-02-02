<script lang="ts">
	import type { DefinitionEntities } from '$lib/types/mcp.types';
	import Icon from '@iconify/svelte';

	let {
		entities
	}: {
		entities: DefinitionEntities;
	} = $props();

	let expandedSections = $state<Set<string>>(new Set(['services', 'models']));

	const entityCategories = $derived(
		[
			{ key: 'services', label: 'Services', icon: 'mdi:server', items: entities.services || [] },
			{ key: 'models', label: 'Models', icon: 'mdi:database', items: entities.models || [] },
			{ key: 'columns', label: 'Columns', icon: 'mdi:table-column', items: entities.columns || [] },
			{
				key: 'relations',
				label: 'Relations',
				icon: 'mdi:relation-many-to-many',
				items: entities.relations || []
			},
			{ key: 'enums', label: 'Enums', icon: 'mdi:format-list-bulleted-type', items: entities.enums || [] }
		].filter((c) => c.items.length > 0)
	);

	const toggleSection = (key: string) => {
		const next = new Set(expandedSections);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		expandedSections = next;
	};

	const formatValue = (val: any): string => {
		if (val === null || val === undefined) return '-';
		if (typeof val === 'object') return JSON.stringify(val, null, 2);
		return String(val);
	};
</script>

<div class="space-y-3">
	<h4 class="flex items-center gap-2 text-sm font-semibold text-white/90">
		<Icon icon="mdi:shape-outline" width="18" height="18" class="text-[#ff6b35]" />
		Entities
	</h4>

	{#each entityCategories as category (category.key)}
		<div class="overflow-hidden rounded-lg border border-white/10">
			<button
				onclick={() => toggleSection(category.key)}
				class="flex w-full items-center justify-between bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
			>
				<div class="flex items-center gap-2">
					<Icon icon={category.icon} width="16" height="16" class="text-[#ff6b35]" />
					<span class="text-sm font-medium text-white/90">{category.label}</span>
					<span
						class="rounded-full bg-[#ff6b35]/20 px-2 py-0.5 text-xs font-medium text-[#ff6b35]"
					>
						{category.items.length}
					</span>
				</div>
				<Icon
					icon="mdi:chevron-down"
					width="18"
					height="18"
					class="text-white/40 transition-transform duration-200 {expandedSections.has(category.key) ? 'rotate-180' : ''}"
				/>
			</button>

			{#if expandedSections.has(category.key)}
				<div class="border-t border-white/10">
					{#if category.items.length > 0 && typeof category.items[0] === 'object'}
						{@const headers = Object.keys(category.items[0])}
						<div class="overflow-x-auto">
							<table class="min-w-full border-collapse">
								<thead class="bg-gradient-to-r from-[#ff6b35] to-[#f7931e]">
									<tr>
										{#each headers as header}
											<th
												class="px-4 py-2.5 text-left text-xs font-semibold tracking-wider whitespace-nowrap text-white"
											>
												{header}
											</th>
										{/each}
									</tr>
								</thead>
								<tbody class="divide-y divide-white/10 bg-white/5">
									{#each category.items as item, idx}
										<tr
											class="{idx % 2 === 0
												? 'bg-white/5'
												: 'bg-white/3'} hover:bg-white/10"
										>
											{#each headers as header}
												<td class="px-4 py-2.5 text-sm text-white/80">
													<div class="max-w-xs truncate" title={formatValue(item[header])}>
														{formatValue(item[header])}
													</div>
												</td>
											{/each}
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="p-4">
							<pre class="overflow-x-auto text-xs text-white/70">{JSON.stringify(category.items, null, 2)}</pre>
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{/each}

	{#if entityCategories.length === 0}
		<p class="py-4 text-center text-sm text-white/40">No entities found in response.</p>
	{/if}
</div>
