<script lang="ts">
	import Icon from '@iconify/svelte';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';

	let {
		block,
		messageId,
		blockIndex,
		selectionState,
		entityType = 'service',
		onDeleteRow,
		onSaveSelected
	}: {
		block: any;
		messageId: number | string;
		blockIndex: number;
		selectionState: any;
		entityType?: string;
		onDeleteRow: (messageId: number | string, blockIndex: number, rowIndex: number, rowData: Record<string, string>, entityType: string) => void;
		onSaveSelected: (messageId: number | string, blockIndex: number, entityType: string) => void;
	} = $props();

	let rejectedRows = $state(new Set<number>());

	const buildRowData = (rowIdx: number): Record<string, string> => {
		const rowData: Record<string, string> = {};
		const headers = block.content.headers;
		const row = block.content.rows[rowIdx];
		headers.forEach((header: string, idx: number) => {
			rowData[header] = row[idx] || '';
		});
		return rowData;
	};

	const getSelectedCount = () => {
		const state = selectionState.get(messageId)?.get(blockIndex);
		if (!state || state.type !== 'table-rows') return 0;
		// Exclude rejected rows from count
		let count = 0;
		state.selected.forEach((idx: number) => {
			if (!rejectedRows.has(idx)) count++;
		});
		return count;
	};

	const isSelected = (rowIdx: number) => {
		if (rejectedRows.has(rowIdx)) return false;
		const state = selectionState.get(messageId)?.get(blockIndex);
		if (!state || state.type !== 'table-rows') return false;
		return state.selected.has(rowIdx);
	};

	const toggleSelection = (rowIdx: number) => {
		if (rejectedRows.has(rowIdx)) return;
		const event = new CustomEvent('toggle-selection', {
			detail: { messageId, blockIndex, rowIdx, itemType: 'table-rows' }
		});
		window.dispatchEvent(event);
	};

	const toggleSelectAll = () => {
		const totalRows = block.content.rows.length;
		const event = new CustomEvent('toggle-select-all', {
			detail: { messageId, blockIndex, totalRows, itemType: 'table-rows' }
		});
		window.dispatchEvent(event);
	};

	const handleRejectRow = (rowIdx: number) => {
		const rowData = buildRowData(rowIdx);
		// Deselect the row if it was selected
		const state = selectionState.get(messageId)?.get(blockIndex);
		if (state && state.type === 'table-rows' && state.selected.has(rowIdx)) {
			const event = new CustomEvent('toggle-selection', {
				detail: { messageId, blockIndex, rowIdx, itemType: 'table-rows' }
			});
			window.dispatchEvent(event);
		}
		// Mark as rejected optimistically
		rejectedRows.add(rowIdx);
		rejectedRows = new Set(rejectedRows);
		// Notify parent to call backend API
		onDeleteRow(messageId, blockIndex, rowIdx, rowData, entityType);
	};

	let selectedRowsCount = $derived(getSelectedCount());
	let totalRows = $derived(block.content.rows.length);
	let activeRows = $derived(block.content.rows.length - rejectedRows.size);
</script>

<div class="group relative my-4 overflow-x-auto rounded-lg border border-white/20 shadow-sm">
	{#if selectedRowsCount > 0}
		<div
			class="absolute top-2 right-2 z-10 flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm"
		>
			<span class="text-xs text-white/80">
				{selectedRowsCount} row{selectedRowsCount !== 1 ? 's' : ''} selected
			</span>
		</div>
	{/if}

	<table class="min-w-full border-collapse divide-y divide-white/10">
		<thead class="bg-gradient-to-r from-[#ff6b35] to-[#f7931e]">
			<tr>
				<th class="w-12 px-3 py-3 text-center">
					<input
						type="checkbox"
						checked={selectedRowsCount === activeRows && activeRows > 0}
						onchange={toggleSelectAll}
						class="h-4 w-4 cursor-pointer rounded border-white/30 bg-white/20 text-[#ff6b35] focus:ring-2 focus:ring-white/50"
						title="Select all rows"
					/>
				</th>
				{#each block.content.headers as header, colIdx}
					<th
						class="px-4 py-3 text-left text-sm font-semibold tracking-wider whitespace-nowrap text-white"
					>
						{@html parseInlineFormatting(header)}
					</th>
				{/each}
				<th class="w-12 px-2 py-3"></th>
			</tr>
		</thead>
		<tbody class="divide-y divide-white/10 bg-white/5">
			{#each block.content.rows as row, rowIdx}
				{@const isRejected = rejectedRows.has(rowIdx)}
				<tr
					class="group/row {isRejected
						? 'opacity-50'
						: rowIdx % 2 === 0
							? 'bg-white/5 hover:bg-white/10'
							: 'bg-white/3 hover:bg-white/10'} {!isRejected && isSelected(rowIdx) ? 'bg-[#ff6b35]/20' : ''}"
					style="transition-colors duration-150;"
				>
					<td class="px-3 py-3 text-center align-middle">
						{#if isRejected}
							<span class="inline-flex h-4 w-4 items-center justify-center">
								<Icon icon="mdi:close-circle" width="16" height="16" class="text-red-400/70" />
							</span>
						{:else}
							<input
								type="checkbox"
								checked={isSelected(rowIdx)}
								onchange={() => toggleSelection(rowIdx)}
								class="h-4 w-4 cursor-pointer rounded border-white/30 bg-white/20 text-[#ff6b35] focus:ring-2 focus:ring-white/50"
							/>
						{/if}
					</td>
					{#each row as cell, cellIdx}
						<td
							class="px-4 py-3 align-top text-sm {isRejected ? 'text-white/40 line-through' : 'text-white/90'}"
						>
							<div class="break-words whitespace-normal">
								{@html parseInlineFormatting(cell || '')}
							</div>
						</td>
					{/each}
					<td class="px-2 py-3 align-middle">
						{#if isRejected}
							<span class="rounded bg-red-500/20 px-2 py-1 text-xs font-medium text-red-400">
								Rejected
							</span>
						{:else}
							<button
								class="rounded bg-white/10 px-2 py-1 text-xs text-white/60 opacity-0 transition-opacity group-hover/row:opacity-100 hover:bg-red-500/20 hover:text-red-400"
								onclick={() => handleRejectRow(rowIdx)}
								title="Reject row"
							>
								<Icon icon="mdi:close" width="14" height="14" />
							</button>
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>

	{#if selectedRowsCount > 0}
		<div class="mt-3 flex justify-end px-4 pb-4">
			<button
				onclick={() => onSaveSelected(messageId, blockIndex, entityType)}
				class="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)]"
			>
				<Icon icon="mdi:database-plus" width="18" height="18" />
				<span>Save to Database</span>
			</button>
		</div>
	{/if}
</div>
