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

export interface RadioGroup {
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

export interface Dropdown {
	name: string;
	label?: string;
	placeholder?: string;
	options: DropdownOption[];
	action?: string;
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
 * Extract radio groups from HTML content
 */
function extractRadioGroups(text: string): { radioGroups: RadioGroup[]; cleanedText: string } {
	const radioGroups: RadioGroup[] = [];
	let cleanedText = text;
	
	// Match radio group containers (divs with radio-group class or similar)
	const radioGroupRegex = /<div[^>]*(?:class="[^"]*radio[^"]*"|data-type="radio-group")[^>]*>([\s\S]*?)<\/div>/gi;
	let groupMatch;
	
	while ((groupMatch = radioGroupRegex.exec(text)) !== null) {
		const groupHtml = groupMatch[1];
		const fullMatch = groupMatch[0];
		
		// Extract name attribute
		const nameMatch = fullMatch.match(/name="([^"]*)"/i) || fullMatch.match(/data-name="([^"]*)"/i);
		const name = nameMatch ? nameMatch[1] : `radio-group-${radioGroups.length}`;
		
		// Extract label
		const labelMatch = fullMatch.match(/data-label="([^"]*)"/i) || groupHtml.match(/<label[^>]*>([\s\S]*?)<\/label>/i);
		const label = labelMatch ? labelMatch[1].replace(/<[^>]*>/g, '').trim() : undefined;
		
		// Extract action
		const actionMatch = fullMatch.match(/data-action="([^"]*)"/i);
		const action = actionMatch ? actionMatch[1] : undefined;
		
		// Extract radio options
		const radioRegex = /<input[^>]*type="radio"[^>]*>/gi;
		const options: RadioOption[] = [];
		let radioMatch;
		
		while ((radioMatch = radioRegex.exec(groupHtml)) !== null) {
			const radioHtml = radioMatch[0];
			const valueMatch = radioHtml.match(/value="([^"]*)"/i);
			const checkedMatch = radioHtml.match(/checked/i);
			
			// Find label for this radio (next label element or label with for attribute)
			const radioIdMatch = radioHtml.match(/id="([^"]*)"/i);
			let labelText = '';
			if (radioIdMatch) {
				const labelForRegex = new RegExp(`<label[^>]*for="${radioIdMatch[1]}"[^>]*>([\\s\\S]*?)<\\/label>`, 'i');
				const labelForMatch = groupHtml.match(labelForRegex);
				if (labelForMatch) {
					labelText = labelForMatch[1].replace(/<[^>]*>/g, '').trim();
				}
			}
			
			// If no label found, try to find next text node or label
			if (!labelText) {
				const afterRadio = groupHtml.substring(radioMatch.index + radioMatch[0].length);
				const nextLabelMatch = afterRadio.match(/<label[^>]*>([\s\S]*?)<\/label>/i);
				if (nextLabelMatch) {
					labelText = nextLabelMatch[1].replace(/<[^>]*>/g, '').trim();
				}
			}
			
			if (valueMatch) {
				options.push({
					value: valueMatch[1],
					label: labelText || valueMatch[1],
					checked: !!checkedMatch
				});
			}
		}
		
		if (options.length > 0) {
			radioGroups.push({
				name,
				label,
				options,
				action
			});
			cleanedText = cleanedText.replace(fullMatch, '');
		}
	}
	
	return { radioGroups, cleanedText: cleanedText.trim() };
}

/**
 * Extract dropdowns from HTML content
 */
function extractDropdowns(text: string): { dropdowns: Dropdown[]; cleanedText: string } {
	const dropdowns: Dropdown[] = [];
	let cleanedText = text;
	
	// Match select elements (dropdowns)
	const selectRegex = /<select[^>]*>([\s\S]*?)<\/select>/gi;
	let selectMatch;
	
	while ((selectMatch = selectRegex.exec(text)) !== null) {
		const fullMatch = selectMatch[0];
		const optionsHtml = selectMatch[1];
		
		// Extract name attribute
		const nameMatch = fullMatch.match(/name="([^"]*)"/i) || fullMatch.match(/data-name="([^"]*)"/i);
		const name = nameMatch ? nameMatch[1] : `dropdown-${dropdowns.length}`;
		
		// Extract label (look for preceding label element)
		const beforeSelect = text.substring(0, selectMatch.index);
		const labelMatch = beforeSelect.match(/<label[^>]*>([\s\S]*?)<\/label>\s*$/i) || 
		                  fullMatch.match(/data-label="([^"]*)"/i);
		const label = labelMatch ? labelMatch[1].replace(/<[^>]*>/g, '').trim() : undefined;
		
		// Extract placeholder
		const placeholderMatch = fullMatch.match(/data-placeholder="([^"]*)"/i);
		const placeholder = placeholderMatch ? placeholderMatch[1] : undefined;
		
		// Extract action
		const actionMatch = fullMatch.match(/data-action="([^"]*)"/i);
		const action = actionMatch ? actionMatch[1] : undefined;
		
		// Extract options
		const optionRegex = /<option[^>]*value="([^"]*)"[^>]*>([\s\S]*?)<\/option>/gi;
		const options: DropdownOption[] = [];
		let optionMatch;
		
		while ((optionMatch = optionRegex.exec(optionsHtml)) !== null) {
			const optionHtml = optionMatch[0];
			const value = optionMatch[1];
			const labelText = optionMatch[2].replace(/<[^>]*>/g, '').trim();
			const selectedMatch = optionHtml.match(/selected/i);
			
			options.push({
				value,
				label: labelText || value,
				selected: !!selectedMatch
			});
		}
		
		// Also handle placeholder option
		const placeholderOptionMatch = optionsHtml.match(/<option[^>]*disabled[^>]*>([\s\S]*?)<\/option>/i);
		if (placeholderOptionMatch && !placeholder) {
			const placeholderText = placeholderOptionMatch[1].replace(/<[^>]*>/g, '').trim();
			if (placeholderText) {
				// This will be used as placeholder
			}
		}
		
		if (options.length > 0 || placeholder) {
			dropdowns.push({
				name,
				label,
				placeholder: placeholder || (placeholderOptionMatch ? placeholderOptionMatch[1].replace(/<[^>]*>/g, '').trim() : undefined),
				options,
				action
			});
			cleanedText = cleanedText.replace(fullMatch, '');
		}
	}
	
	return { dropdowns, cleanedText: cleanedText.trim() };
}

export function parseMarkdown(md: string): ParsedBlock[] {
	// Pre-process: split inline heading markers onto separate lines
	// This handles cases where content arrives as one long string with #### inline
	// e.g., "Summary text #### Heading Content" → "Summary text\n#### Heading Content"
	let preprocessed = md.replace(/([^\n])(\s*#{1,6}\s+)/g, '$1\n$2');
	// Also split inline numbered list items onto separate lines
	// e.g., "some text 1. First item 2. Second item" → "some text\n1. First item\n2. Second item"
	preprocessed = preprocessed.replace(/([^\n])\s+(\d+\.\s)/g, '$1\n$2');

	const lines = preprocessed.split('\n');
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
		} else if (line.startsWith('###### ')) {
			result.push({ type: 'h6', content: line.substring(7) });
			i++;
		} else if (line.startsWith('##### ')) {
			result.push({ type: 'h5', content: line.substring(6) });
			i++;
		} else if (line.startsWith('#### ')) {
			result.push({ type: 'h4', content: line.substring(5) });
			i++;
		} else if (line.startsWith('### ')) {
			result.push({ type: 'h3', content: line.substring(4) });
			i++;
		} else if (line.startsWith('## ')) {
			result.push({ type: 'h2', content: line.substring(3) });
			i++;
		} else if (line.startsWith('# ')) {
			result.push({ type: 'h1', content: line.substring(2) });
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
		} else if (line.trim().match(/^\d+\.\s/)) {
			// Numbered/ordered list items
			const listItems: ListItem[] = [];
			while (
				i < lines.length &&
				(lines[i].trim().match(/^\d+\.\s/) || lines[i].trim().startsWith('   '))
			) {
				const indent = lines[i].search(/\S/);
				const text = lines[i].trim().replace(/^\d+\.\s*/, '');
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
			// Accumulate paragraph text to handle multi-line HTML
			accumulatedText += (accumulatedText ? '\n' : '') + block.content;
		} else {
			// When we hit a non-paragraph block, process accumulated text
			if (accumulatedText) {
				let processedText = accumulatedText;
				
				// Extract buttons
				const { buttons, cleanedText: textAfterButtons } = extractButtons(processedText);
				processedText = textAfterButtons;
				
				// Extract radio groups
				const { radioGroups, cleanedText: textAfterRadios } = extractRadioGroups(processedText);
				processedText = textAfterRadios;
				
				// Extract dropdowns
				const { dropdowns, cleanedText: textAfterDropdowns } = extractDropdowns(processedText);
				processedText = textAfterDropdowns;
				
				// Add text content if any remains
				if (processedText.trim()) {
					finalResult.push({ type: 'p', content: processedText });
				}
				
				// Add interactive elements
				if (buttons.length > 0) {
					finalResult.push({ type: 'buttons', content: buttons });
				}
				if (radioGroups.length > 0) {
					finalResult.push({ type: 'radio-group', content: radioGroups });
				}
				if (dropdowns.length > 0) {
					finalResult.push({ type: 'dropdown', content: dropdowns });
				}
				
				accumulatedText = '';
			}
			finalResult.push(block);
		}
	}
	
	// Process any remaining accumulated text
	if (accumulatedText) {
		let processedText = accumulatedText;
		
		// Extract buttons
		const { buttons, cleanedText: textAfterButtons } = extractButtons(processedText);
		processedText = textAfterButtons;
		
		// Extract radio groups
		const { radioGroups, cleanedText: textAfterRadios } = extractRadioGroups(processedText);
		processedText = textAfterRadios;
		
		// Extract dropdowns
		const { dropdowns, cleanedText: textAfterDropdowns } = extractDropdowns(processedText);
		processedText = textAfterDropdowns;
		
		// Add text content if any remains
		if (processedText.trim()) {
			finalResult.push({ type: 'p', content: processedText });
		}
		
		// Add interactive elements
		if (buttons.length > 0) {
			finalResult.push({ type: 'buttons', content: buttons });
		}
		if (radioGroups.length > 0) {
			finalResult.push({ type: 'radio-group', content: radioGroups });
		}
		if (dropdowns.length > 0) {
			finalResult.push({ type: 'dropdown', content: dropdowns });
		}
	}

	return finalResult;
}

export function parseTable(lines: string[]): TableData {
	if (lines.length < 2) return { headers: [], rows: [] };
	let headers = lines[0]
		.split('|')
		.map((h) => h.trim())
		.filter((h) => h !== '');
	
	// Reorder headers: Service Name should come before Status
	const serviceNameIndex = headers.indexOf('Service Name');
	const statusIndex = headers.indexOf('Status');
	
	if (serviceNameIndex !== -1 && statusIndex !== -1 && serviceNameIndex > statusIndex) {
		// Remove Service Name from its current position
		headers = headers.filter((_, idx) => idx !== serviceNameIndex);
		// Insert Service Name before Status
		const newStatusIndex = headers.indexOf('Status');
		headers.splice(newStatusIndex, 0, 'Service Name');
		
		// Reorder rows to match new header order
		const rows = lines.slice(2).map((row) => {
			const cells = row
				.split('|')
				.map((cell) => cell.trim())
				.filter((cell) => cell !== '');
			// Reorder cells to match reordered headers
			const originalHeaders = lines[0]
				.split('|')
				.map((h) => h.trim())
				.filter((h) => h !== '');
			const reorderedCells: string[] = [];
			headers.forEach((header) => {
				const originalIndex = originalHeaders.indexOf(header);
				reorderedCells.push(cells[originalIndex] || '');
			});
			return reorderedCells;
		});
		return { headers, rows };
	}
	
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
		} else if (block.type === 'h4') {
			md += `#### ${block.content}\n\n`;
		} else if (block.type === 'h5') {
			md += `##### ${block.content}\n\n`;
		} else if (block.type === 'h6') {
			md += `###### ${block.content}\n\n`;
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

