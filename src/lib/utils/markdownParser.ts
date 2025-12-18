/**
 * Markdown parsing utilities for formatting code blocks, tables, lists, and other markdown elements
 */

export interface ParsedBlock {
	type: string;
	content?: any;
	language?: string;
}

export interface TableData {
	headers: string[];
	rows: string[][];
}

export interface ChecklistItem {
	checked: boolean;
	text: string;
}

export interface ListItem {
	text: string;
	indent: number;
}

export interface ButtonData {
	text: string;
	action: string;
	operation?: string;
	payload?: string;
	className?: string;
}

export interface RadioOption {
	value: string;
	label: string;
	checked?: boolean;
}

export interface RadioGroupData {
	name: string;
	label?: string;
	options: RadioOption[];
	action?: string;
}

export interface DropdownOption {
	value: string;
	label: string;
	selected?: boolean;
}

export interface DropdownData {
	name: string;
	label?: string;
	options: DropdownOption[];
	action?: string;
	placeholder?: string;
}

/**
 * Extract HTML buttons from text content (handles multi-line HTML)
 */
function extractButtons(text: string): { buttons: ButtonData[]; cleanedText: string } {
	const buttons: ButtonData[] = [];
	let cleanedText = text;
	
	// First, extract action-buttons div wrapper if present (handles multi-line)
	const actionButtonsRegex = /<div[^>]*class="action-buttons"[^>]*>([\s\S]*?)<\/div>/gi;
	let divMatch;
	let buttonsHtml = '';
	
	while ((divMatch = actionButtonsRegex.exec(text)) !== null) {
		buttonsHtml = divMatch[1];
		cleanedText = cleanedText.replace(divMatch[0], '');
	}
	
	// If we found a div, extract buttons from it, otherwise search in the full text
	const searchText = buttonsHtml || text;
	
	// Match button elements with data attributes (handles multi-line with [\s\S])
	const buttonRegex = /<button[^>]*data-action="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi;
	let match;
	
	while ((match = buttonRegex.exec(searchText)) !== null) {
		const fullMatch = match[0];
		const action = match[1];
		const buttonText = match[2].trim().replace(/\s+/g, ' '); // Clean up whitespace
		
		// Extract additional attributes
		const operationMatch = fullMatch.match(/data-operation="([^"]*)"/i);
		const payloadMatch = fullMatch.match(/data-payload='([^']*)'/i);
		const classMatch = fullMatch.match(/class="([^"]*)"/i);
		
		buttons.push({
			text: buttonText,
			action: action,
			operation: operationMatch ? operationMatch[1] : undefined,
			payload: payloadMatch ? payloadMatch[1] : undefined,
			className: classMatch ? classMatch[1] : undefined
		});
		
		// Remove button from cleaned text if not already removed by div
		if (!buttonsHtml) {
			cleanedText = cleanedText.replace(fullMatch, '');
		}
	}
	
	return { buttons, cleanedText: cleanedText.trim() };
}

/**
 * Extract radio button groups from HTML
 */
function extractRadioGroups(text: string): { radioGroups: RadioGroupData[]; cleanedText: string } {
	const radioGroups: RadioGroupData[] = [];
	let cleanedText = text;
	
	// Extract radio-group divs
	const radioGroupRegex = /<div[^>]*class="radio-group"[^>]*>([\s\S]*?)<\/div>/gi;
	let match;
	
	while ((match = radioGroupRegex.exec(text)) !== null) {
		const fullMatch = match[0];
		const groupHtml = match[1];
		
		// Extract group attributes
		const nameMatch = fullMatch.match(/data-name="([^"]*)"/i);
		const labelMatch = fullMatch.match(/data-label="([^"]*)"/i);
		const actionMatch = fullMatch.match(/data-action="([^"]*)"/i);
		
		if (!nameMatch) continue;
		
		const options: RadioOption[] = [];
		const optionRegex = /<input[^>]*type="radio"[^>]*>/gi;
		let optionMatch;
		
		while ((optionMatch = optionRegex.exec(groupHtml)) !== null) {
			const optionHtml = optionMatch[0];
			const valueMatch = optionHtml.match(/value="([^"]*)"/i);
			const labelTextMatch = groupHtml.match(new RegExp(`${optionHtml.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^<]*<label[^>]*>([^<]+)</label>`, 'i'));
			const checkedMatch = optionHtml.match(/checked/i);
			
			if (valueMatch) {
				options.push({
					value: valueMatch[1],
					label: labelTextMatch ? labelTextMatch[1].trim() : valueMatch[1],
					checked: !!checkedMatch
				});
			}
		}
		
		if (options.length > 0) {
			radioGroups.push({
				name: nameMatch[1],
				label: labelMatch ? labelMatch[1] : undefined,
				options: options,
				action: actionMatch ? actionMatch[1] : undefined
			});
		}
		
		cleanedText = cleanedText.replace(fullMatch, '');
	}
	
	return { radioGroups, cleanedText: cleanedText.trim() };
}

/**
 * Extract dropdown/select elements from HTML
 */
function extractDropdowns(text: string): { dropdowns: DropdownData[]; cleanedText: string } {
	const dropdowns: DropdownData[] = [];
	let cleanedText = text;
	
	// Extract select elements
	const selectRegex = /<select[^>]*>([\s\S]*?)<\/select>/gi;
	let match;
	
	while ((match = selectRegex.exec(text)) !== null) {
		const fullMatch = match[0];
		const selectHtml = match[1];
		
		// Extract select attributes
		const nameMatch = fullMatch.match(/name="([^"]*)"/i) || fullMatch.match(/data-name="([^"]*)"/i);
		const labelMatch = fullMatch.match(/data-label="([^"]*)"/i);
		const actionMatch = fullMatch.match(/data-action="([^"]*)"/i);
		const placeholderMatch = fullMatch.match(/data-placeholder="([^"]*)"/i);
		
		if (!nameMatch) continue;
		
		const options: DropdownOption[] = [];
		const optionRegex = /<option[^>]*>([\s\S]*?)<\/option>/gi;
		let optionMatch;
		
		while ((optionMatch = optionRegex.exec(selectHtml)) !== null) {
			const optionFullMatch = optionMatch[0];
			const optionLabel = optionMatch[1].trim();
			const valueMatch = optionFullMatch.match(/value="([^"]*)"/i);
			const selectedMatch = optionFullMatch.match(/selected/i);
			
			options.push({
				value: valueMatch ? valueMatch[1] : optionLabel,
				label: optionLabel,
				selected: !!selectedMatch
			});
		}
		
		if (options.length > 0) {
			dropdowns.push({
				name: nameMatch[1],
				label: labelMatch ? labelMatch[1] : undefined,
				options: options,
				action: actionMatch ? actionMatch[1] : undefined,
				placeholder: placeholderMatch ? placeholderMatch[1] : undefined
			});
		}
		
		cleanedText = cleanedText.replace(fullMatch, '');
	}
	
	return { dropdowns, cleanedText: cleanedText.trim() };
}

export function parseMarkdown(md: string): ParsedBlock[] {
	const lines = md.split('\n');
	const result: ParsedBlock[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];

		if (line.trim().startsWith('```')) {
			const language = line.trim().substring(3);
			const codeLines = [];
			i++;
			while (i < lines.length && !lines[i].trim().startsWith('```')) {
				codeLines.push(lines[i]);
				i++;
			}
			result.push({ type: 'code', language, content: codeLines.join('\n') });
			i++;
		} else if (line.startsWith('# ')) {
			result.push({ type: 'h1', content: line.substring(2) });
			i++;
		} else if (line.startsWith('## ')) {
			result.push({ type: 'h2', content: line.substring(3) });
			i++;
		} else if (line.startsWith('### ')) {
			result.push({ type: 'h3', content: line.substring(4) });
			i++;
		} else if (line.trim() === '---') {
			result.push({ type: 'hr' });
			i++;
		} else if (line.includes('|') && line.trim().startsWith('|')) {
			const tableLines = [];
			while (i < lines.length && lines[i].includes('|')) {
				tableLines.push(lines[i]);
				i++;
			}
			result.push({ type: 'table', content: parseTable(tableLines) });
		} else if (line.trim().match(/^- \[[ x]\]/)) {
			const listItems: ChecklistItem[] = [];
			while (i < lines.length && lines[i].trim().match(/^- \[[ x]\]/)) {
				const checked = lines[i].includes('[x]');
				const text = lines[i].trim().substring(6);
				listItems.push({ checked, text });
				i++;
			}
			result.push({ type: 'checklist', content: listItems });
		} else if (line.trim().startsWith('- ')) {
			const listItems: ListItem[] = [];
			while (
				i < lines.length &&
				(lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('  -'))
			) {
				const indent = lines[i].search(/\S/);
				const text = lines[i].trim().substring(2);
				listItems.push({ text, indent });
				i++;
			}
			result.push({ type: 'list', content: listItems });
		} else if (line.trim() !== '') {
			result.push({ type: 'p', content: line });
			i++;
		} else {
			i++;
		}
	}
	
	// Post-process: check for buttons, radio groups, and dropdowns in paragraph blocks that might span multiple lines
	// This handles cases where interactive elements are embedded in the markdown text
	const finalResult: ParsedBlock[] = [];
	let accumulatedText = '';
	
	for (let j = 0; j < result.length; j++) {
		const block = result[j];
		if (block.type === 'p' && block.content) {
			// Accumulate paragraph text to handle multi-line HTML elements
			accumulatedText += (accumulatedText ? '\n' : '') + block.content;
		} else {
			// When we hit a non-paragraph block, process accumulated text
			if (accumulatedText) {
				processAccumulatedText(accumulatedText, finalResult);
				accumulatedText = '';
			}
			finalResult.push(block);
		}
	}
	
	// Process any remaining accumulated text
	if (accumulatedText) {
		processAccumulatedText(accumulatedText, finalResult);
	}

	return finalResult;
}

/**
 * Process accumulated text to extract interactive elements (buttons, radio groups, dropdowns)
 */
function processAccumulatedText(text: string, result: ParsedBlock[]): void {
	let cleanedText = text;
	
	// Extract buttons
	const { buttons, cleanedText: afterButtons } = extractButtons(cleanedText);
	cleanedText = afterButtons;
	
	// Extract radio groups
	const { radioGroups, cleanedText: afterRadio } = extractRadioGroups(cleanedText);
	cleanedText = afterRadio;
	
	// Extract dropdowns
	const { dropdowns, cleanedText: afterDropdowns } = extractDropdowns(cleanedText);
	cleanedText = afterDropdowns;
	
	// Add cleaned text if any remains
	if (cleanedText.trim()) {
		result.push({ type: 'p', content: cleanedText });
	}
	
	// Add interactive elements
	if (radioGroups.length > 0) {
		result.push({ type: 'radio-group', content: radioGroups });
	}
	
	if (dropdowns.length > 0) {
		result.push({ type: 'dropdown', content: dropdowns });
	}
	
	if (buttons.length > 0) {
		result.push({ type: 'buttons', content: buttons });
	}
}

export function parseTable(lines: string[]): TableData {
	if (lines.length < 2) return { headers: [], rows: [] };
	const headers = lines[0]
		.split('|')
		.map((h) => h.trim())
		.filter((h) => h !== '');
	const rows = lines.slice(2).map((row) =>
		row
			.split('|')
			.map((cell) => cell.trim())
			.filter((cell) => cell !== '')
	);
	return { headers, rows };
}

export function parseInlineFormatting(text: string): string {
	text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
	text = text.replace(
		/`(.*?)`/g,
		'<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-[#ff6b35]">$1</code>'
	);
	return text;
}

/**
 * Reconstruct markdown from parsed blocks
 */
export function reconstructMarkdown(blocks: ParsedBlock[]): string {
	let md = '';

	for (const block of blocks) {
		if (block.type === 'h1') {
			md += `# ${block.content}\n\n`;
		} else if (block.type === 'h2') {
			md += `## ${block.content}\n\n`;
		} else if (block.type === 'h3') {
			md += `### ${block.content}\n\n`;
		} else if (block.type === 'hr') {
			md += '---\n\n';
		} else if (block.type === 'code') {
			md += `\`\`\`${block.language || ''}\n${block.content}\n\`\`\`\n\n`;
		} else if (block.type === 'table') {
			// Reconstruct table
			const headers = block.content.headers.join(' | ');
			md += `| ${headers} |\n`;
			md += `| ${block.content.headers.map(() => '---').join(' | ')} |\n`;
			for (const row of block.content.rows) {
				md += `| ${row.join(' | ')} |\n`;
			}
			md += '\n';
		} else if (block.type === 'checklist') {
			for (const item of block.content) {
				md += `- [${item.checked ? 'x' : ' '}] ${item.text}\n`;
			}
			md += '\n';
		} else if (block.type === 'list') {
			for (const item of block.content) {
				const indent = ' '.repeat(item.indent);
				md += `${indent}- ${item.text}\n`;
			}
			md += '\n';
		} else if (block.type === 'p') {
			md += `${block.content}\n\n`;
		}
	}

	return md.trim();
}

/**
 * Delete a table row from parsed blocks
 */
export function deleteTableRowFromBlocks(
	blocks: ParsedBlock[],
	blockIndex: number,
	rowIndex: number
): ParsedBlock[] {
	if (blocks[blockIndex]?.type === 'table') {
		const newBlocks = [...blocks];
		const tableBlock = { ...newBlocks[blockIndex] };
		tableBlock.content = {
			...tableBlock.content,
			rows: tableBlock.content.rows.filter((_: any, idx: number) => idx !== rowIndex)
		};
		newBlocks[blockIndex] = tableBlock;
		return newBlocks;
	}
	return blocks;
}

/**
 * Delete a list item from parsed blocks
 */
export function deleteListItemFromBlocks(
	blocks: ParsedBlock[],
	blockIndex: number,
	itemIndex: number
): ParsedBlock[] {
	if (
		blocks[blockIndex]?.type === 'list' ||
		blocks[blockIndex]?.type === 'checklist'
	) {
		const newBlocks = [...blocks];
		const listBlock = { ...newBlocks[blockIndex] };
		listBlock.content = listBlock.content.filter((_: any, idx: number) => idx !== itemIndex);

		// If list is empty, remove the entire block
		if (listBlock.content.length === 0) {
			newBlocks.splice(blockIndex, 1);
		} else {
			newBlocks[blockIndex] = listBlock;
		}

		return newBlocks;
	}
	return blocks;
}

