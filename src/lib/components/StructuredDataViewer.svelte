<script lang="ts">
	import type { StructuredResponse } from '$lib/types/chat.ts';
	import { browser } from '$app/environment';
	import Icon from '@iconify/svelte';

	let { data, actions = [] }: { data: StructuredResponse; actions?: string[] } = $props();

	// Track selected rows
	let selectedRows = $state(new Set<number>());

	// Debug logging
	console.log('StructuredDataViewer received data:', data);
	console.log('StructuredDataViewer received actions:', actions);

	const downloadData = (format: string) => {
		const content = JSON.stringify(data.Data, null, 2);
		const blob = new Blob([content], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `data.${format}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
	};

	// Toggle row selection
	const toggleRowSelection = (index: number) => {
		if (selectedRows.has(index)) {
			selectedRows.delete(index);
		} else {
			selectedRows.add(index);
		}
		// Trigger reactivity by reassigning
		selectedRows = new Set(selectedRows);
	};

	// Toggle select all rows
	const toggleSelectAll = () => {
		if (!data.Data || !Array.isArray(data.Data)) return;

		if (selectedRows.size === data.Data.length) {
			selectedRows.clear();
		} else {
			selectedRows = new Set(Array.from({ length: data.Data.length }, (_, i) => i));
		}
		// Trigger reactivity by reassigning
		selectedRows = new Set(selectedRows);
	};

	// Check if all rows are selected
	const isAllSelected = () => {
		if (!data.Data || !Array.isArray(data.Data) || data.Data.length === 0) return false;
		return selectedRows.size === data.Data.length;
	};

	// Add selected data to local storage
	const addToDatabase = () => {
		if (!browser) return;

		if (selectedRows.size === 0) {
			alert('Please select at least one row to add to database');
			return;
		}

		if (!data.Data || !Array.isArray(data.Data)) return;

		// Get selected rows
		const dataArray = data.Data;
		const selectedData = Array.from(selectedRows)
			.sort((a, b) => a - b)
			.map((index) => dataArray[index]);

		// Get existing data from localStorage
		const storageKey = 'database_records';
		const existingData = localStorage.getItem(storageKey);
		let databaseRecords: any[] = [];

		if (existingData) {
			try {
				databaseRecords = JSON.parse(existingData);
			} catch (e) {
				console.error('Error parsing existing database records:', e);
				databaseRecords = [];
			}
		}

		// Add new records with timestamp
		const newRecords = selectedData.map((record) => ({
			...record,
			_addedAt: new Date().toISOString(),
			_id: Date.now() + Math.random()
		}));

		databaseRecords.push(...newRecords);

		// Save back to localStorage
		try {
			localStorage.setItem(storageKey, JSON.stringify(databaseRecords));
			alert(`Successfully added ${selectedRows.size} row(s) to database`);
			selectedRows.clear();
			// Trigger reactivity by reassigning
			selectedRows = new Set(selectedRows);
		} catch (e) {
			console.error('Error saving to localStorage:', e);
			alert('Error saving to database. Please try again.');
		}
	};
</script>

<div class="structured-data-viewer">
	<!-- Conversational Message -->
	{#if data.Message}
		<div class="conversational-message">
			<p>{data.Message}</p>
		</div>
	{/if}

	<!-- Structured Data Display -->
	{#if data.Data && data.Data.length > 0}
		<div class="data-section">
			<div class="data-header">
				<h3>Data ({data.ResponseFormat || 'json'})</h3>
				<div class="data-actions">
					<button
						class="action-button"
						onclick={() => copyToClipboard(JSON.stringify(data.Data, null, 2))}
						title="Copy to clipboard"
					>
						<Icon icon="mdi:content-copy" style="width: 1rem; height: 1rem;" />
						Copy
					</button>
					<button class="action-button" onclick={() => downloadData('json')} title="Download JSON">
						<Icon icon="mdi:download" style="width: 1rem; height: 1rem;" />
						Download
					</button>
				</div>
			</div>

			<!-- JSON Viewer -->
			{#if data.ResponseFormat === 'json'}
				<div class="json-viewer">
					<pre><code>{JSON.stringify(data.Data, null, 2)}</code></pre>
				</div>
			{/if}

			<!-- Table Viewer -->
			{#if data.Data && Array.isArray(data.Data) && data.Data.length > 0}
				<div class="table-viewer">
					<div class="table-controls">
						<button
							class="add-database-button"
							onclick={addToDatabase}
							disabled={selectedRows.size === 0}
							title="Add selected rows to database"
						>
							<Icon icon="mdi:database-plus" style="width: 1.25rem; height: 1.25rem;" />
							ADD DATABASE
						</button>
						{#if selectedRows.size > 0}
							<span class="selection-count">{selectedRows.size} row(s) selected</span>
						{/if}
					</div>
					<table>
						<thead>
							<tr>
								<th class="checkbox-column">
									<input
										type="checkbox"
										checked={isAllSelected()}
										onchange={toggleSelectAll}
										class="row-checkbox"
										title="Select all rows"
									/>
								</th>
								{#each Object.keys(data.Data[0]) as header}
									<th>{header}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each data.Data as row, rowIndex}
								<tr class:selected={selectedRows.has(rowIndex)}>
									<td class="checkbox-column">
										<input
											type="checkbox"
											checked={selectedRows.has(rowIndex)}
											onchange={() => toggleRowSelection(rowIndex)}
											class="row-checkbox"
										/>
									</td>
									{#each Object.values(row) as cell}
										<td>{cell}</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	{:else}
		<div class="no-data">
			<p>No structured data available</p>
		</div>
	{/if}

	<!-- Suggested Actions -->
	{#if actions && actions.length > 0}
		<div class="suggested-actions">
			<h4>Suggested Actions:</h4>
			<div class="action-buttons">
				{#each actions as action}
					<button class="suggested-action-button">
						{action}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.structured-data-viewer {
		margin-top: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.conversational-message {
		padding: 1rem;
		background-color: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
	}

	.conversational-message p {
		margin: 0;
		color: #374151;
	}

	.data-section {
		padding: 1rem;
	}

	.data-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.data-header h3 {
		margin: 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.data-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-button {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		background-color: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: background-color 0.2s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.action-button:hover {
		background-color: #e5e7eb;
	}

	.json-viewer {
		background-color: #1f2937;
		border-radius: 0.375rem;
		padding: 1rem;
		overflow-x: auto;
	}

	.json-viewer pre {
		margin: 0;
		color: #f9fafb;
		font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.table-viewer {
		overflow-x: auto;
	}

	.table-controls {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 0.5rem;
	}

	.add-database-button {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
		font-weight: 600;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		transition: background-color 0.2s;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.add-database-button:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.add-database-button:disabled {
		background-color: #9ca3af;
		cursor: not-allowed;
		opacity: 0.6;
	}

	.selection-count {
		font-size: 0.875rem;
		color: #6b7280;
	}

	.table-viewer table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
	}

	.table-viewer th,
	.table-viewer td {
		padding: 0.5rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	.table-viewer th {
		background-color: #f9fafb;
		font-weight: 600;
		color: #374151;
	}

	.checkbox-column {
		width: 3rem;
		text-align: center;
	}

	.row-checkbox {
		width: 1rem;
		height: 1rem;
		cursor: pointer;
		accent-color: #3b82f6;
	}

	.table-viewer tbody tr.selected {
		background-color: #dbeafe;
	}

	.table-viewer tbody tr:hover {
		background-color: #f3f4f6;
	}

	.table-viewer tbody tr.selected:hover {
		background-color: #bfdbfe;
	}

	.suggested-actions {
		padding: 1rem;
		background-color: #f9fafb;
		border-top: 1px solid #e5e7eb;
	}

	.suggested-actions h4 {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}

	.action-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.suggested-action-button {
		padding: 0.25rem 0.75rem;
		font-size: 0.75rem;
		background-color: #3b82f6;
		color: white;
		border: none;
		border-radius: 0.25rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.suggested-action-button:hover {
		background-color: #2563eb;
	}

	.no-data {
		padding: 1rem;
		text-align: center;
		color: #6b7280;
		font-style: italic;
	}
</style>
