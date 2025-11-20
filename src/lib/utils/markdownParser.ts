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

	return result;
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

