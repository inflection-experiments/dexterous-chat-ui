/**
 * Local storage utilities for managing conversation data
 */

export interface ConversationData {
	conversationId?: string;
	userId: string;
	referenceMessageId: string;
	timestamp: string;
	messages?: any[];
	selectedItems?: SelectedItem[];
}

export interface SelectedItem {
	messageId: string;
	blockIndex: number;
	tableHeaders?: string[];
	selectedRows?: SelectedRow[];
}

export interface SelectedRow {
	headers: string[];
	row: string[];
	rowIndex: number;
}

/**
 * Load data from local storage
 */
export function loadFromLocalStorage(storageKey: string): Record<string, ConversationData> | null {
	try {
		if (typeof window === 'undefined') return null;
		const stored = localStorage.getItem(storageKey);
		if (!stored) return null;
		return JSON.parse(stored);
	} catch (error) {
		console.error('Error loading from local storage:', error);
		return null;
	}
}

/**
 * Save data to local storage
 */
export function saveToLocalStorage(
	storageKey: string,
	data: Record<string, ConversationData>
): void {
	try {
		if (typeof window === 'undefined') return;
		localStorage.setItem(storageKey, JSON.stringify(data));
	} catch (error) {
		console.error('Error saving to local storage:', error);
		throw error;
	}
}

/**
 * Get conversation data from local storage
 */
export function getConversationData(
	storageKey: string,
	conversationId: string
): ConversationData | null {
	const allData = loadFromLocalStorage(storageKey);
	if (!allData) return null;
	return allData[conversationId] || null;
}

/**
 * Save conversation data to local storage
 */
export function saveConversationData(
	storageKey: string,
	conversationId: string,
	data: ConversationData
): void {
	const allData = loadFromLocalStorage(storageKey) || {};
	allData[conversationId] = data;
	saveToLocalStorage(storageKey, allData);
}

/**
 * Add selected items to conversation data
 */
export function addSelectedItems(
	storageKey: string,
	conversationId: string,
	newItems: SelectedItem[]
): void {
	const allData = loadFromLocalStorage(storageKey) || {};
	let conversationData = allData[conversationId];

	if (!conversationData) {
		conversationData = {
			conversationId,
			userId: '',
			referenceMessageId: '',
			timestamp: new Date().toISOString(),
			selectedItems: []
		};
	}

	if (!conversationData.selectedItems) {
		conversationData.selectedItems = [];
	}

	// Merge new items with existing ones (avoid duplicates)
	const existingItemKeys = new Set(
		conversationData.selectedItems.map((item) => `${item.messageId}-${item.blockIndex}`)
	);

	newItems.forEach((item) => {
		const key = `${item.messageId}-${item.blockIndex}`;
		if (!existingItemKeys.has(key)) {
			conversationData.selectedItems!.push(item);
		} else {
			// Update existing item with new selections
			const existingItem = conversationData.selectedItems!.find(
				(existing) => `${existing.messageId}-${existing.blockIndex}` === key
			);
			if (existingItem) {
				// Merge selected rows
				const existingRowIndices = new Set(
					existingItem.selectedRows?.map((r) => r.rowIndex) || []
				);
				item.selectedRows?.forEach((row) => {
					if (!existingRowIndices.has(row.rowIndex)) {
						if (!existingItem.selectedRows) {
							existingItem.selectedRows = [];
						}
						existingItem.selectedRows.push(row);
					}
				});
			}
		}
	});

	conversationData.timestamp = new Date().toISOString();
	allData[conversationId] = conversationData;
	saveToLocalStorage(storageKey, allData);
}

/**
 * Remove selected items from conversation data
 */
export function removeSelectedItems(
	storageKey: string,
	conversationId: string,
	messageId: string,
	blockIndex: number
): void {
	const allData = loadFromLocalStorage(storageKey);
	if (!allData || !allData[conversationId]) return;

	const conversationData = allData[conversationId];
	if (!conversationData.selectedItems) return;

	conversationData.selectedItems = conversationData.selectedItems.filter(
		(item) => !(item.messageId === messageId && item.blockIndex === blockIndex)
	);

	conversationData.timestamp = new Date().toISOString();
	allData[conversationId] = conversationData;
	saveToLocalStorage(storageKey, allData);
}

/**
 * Clear all selected items for a conversation
 */
export function clearSelectedItems(storageKey: string, conversationId: string): void {
	const allData = loadFromLocalStorage(storageKey);
	if (!allData || !allData[conversationId]) return;

	const conversationData = allData[conversationId];
	conversationData.selectedItems = [];
	conversationData.timestamp = new Date().toISOString();
	allData[conversationId] = conversationData;
	saveToLocalStorage(storageKey, allData);
}

