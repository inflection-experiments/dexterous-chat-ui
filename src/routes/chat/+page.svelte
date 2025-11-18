<script lang="ts">
	import type { Message } from "$lib/types/chat.ts";

  // import type { Message } from '$lib/types/chat';

  const CONVERSATION_ID = '98b6495b-01fe-445f-804e-c20e1d3ba2d0';
  const USER_ID = '74f22a5f-8ed2-45ce-af2e-ac4c32d824f4';
  const REFERENCE_MESSAGE_ID = '123e4567-e89b-12d3-a456-426655440000';

  let messages: Message[] = [];
  let newMessageText = '';
  let chatContainer: HTMLElement;
  let inputElement: HTMLTextAreaElement;
  let isLoading = false;
  let sidebarOpen = true;
  let inputFocused = false;
  
  // Store parsed content for each message to enable editing
  let parsedMessageContent = new Map<number | string, any[]>();
  
  // Store selection state for each message: { messageId: { blockIndex: { type: 'table'|'list'|'checklist', selected: Set<indices> } } }
  let selectionState = new Map<number | string, Map<number, { type: string, selected: Set<number> }>>();

  // Markdown parsing functions
  function parseMarkdown(md: string) {
    const lines = md.split('\n');
    const result: any[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Code block
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
      }
      // H1
      else if (line.startsWith('# ')) {
        result.push({ type: 'h1', content: line.substring(2) });
        i++;
      }
      // H2
      else if (line.startsWith('## ')) {
        result.push({ type: 'h2', content: line.substring(3) });
        i++;
      }
      // H3
      else if (line.startsWith('### ')) {
        result.push({ type: 'h3', content: line.substring(4) });
        i++;
      }
      // HR
      else if (line.trim() === '---') {
        result.push({ type: 'hr' });
        i++;
      }
      // Table
      else if (line.includes('|') && line.trim().startsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].includes('|')) {
          tableLines.push(lines[i]);
          i++;
        }
        result.push({ type: 'table', content: parseTable(tableLines) });
      }
      // Checkbox list
      else if (line.trim().match(/^- \[[ x]\]/)) {
        const listItems = [];
        while (i < lines.length && lines[i].trim().match(/^- \[[ x]\]/)) {
          const checked = lines[i].includes('[x]');
          const text = lines[i].trim().substring(6);
          listItems.push({ checked, text });
          i++;
        }
        result.push({ type: 'checklist', content: listItems });
      }
      // Bullet list
      else if (line.trim().startsWith('- ')) {
        const listItems = [];
        while (i < lines.length && (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('  -'))) {
          const indent = lines[i].search(/\S/);
          const text = lines[i].trim().substring(2);
          listItems.push({ text, indent });
          i++;
        }
        result.push({ type: 'list', content: listItems });
      }
      // Paragraph
      else if (line.trim() !== '') {
        result.push({ type: 'p', content: line });
        i++;
      }
      // Empty line
      else {
        i++;
      }
    }

    return result;
  }

  function parseTable(lines: string[]) {
    if (lines.length < 2) return { headers: [], rows: [] };
    
    const headers = lines[0]
      .split('|')
      .map(h => h.trim())
      .filter(h => h !== '');
    
    const rows = lines.slice(2).map(row =>
      row
        .split('|')
        .map(cell => cell.trim())
        .filter(cell => cell !== '')
    );

    return { headers, rows };
  }

  function parseInlineFormatting(text: string) {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>');
    // Code
    text = text.replace(/`(.*?)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-[#ff6b35]">$1</code>');
    return text;
  }

  // Reconstruct markdown from parsed blocks
  function reconstructMarkdown(blocks: any[]): string {
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

  // Get or parse content for a message
  function getParsedContent(messageId: number | string, content: string): any[] {
    if (!parsedMessageContent.has(messageId)) {
      parsedMessageContent.set(messageId, parseMarkdown(content));
    }
    return parsedMessageContent.get(messageId)!;
  }

  // Update message content after editing
  function updateMessageContent(messageId: number | string) {
    const parsed = parsedMessageContent.get(messageId);
    if (parsed) {
      const newContent = reconstructMarkdown(parsed);
      messages = messages.map(msg => 
        msg.id === messageId ? { ...msg, Content: newContent } : msg
      );
      // Update the parsed content map with the modified parsed blocks
      parsedMessageContent.set(messageId, [...parsed]);
    }
  }

  // Delete table row
  function deleteTableRow(messageId: number | string, blockIndex: number, rowIndex: number) {
    const parsed = parsedMessageContent.get(messageId);
    if (parsed && parsed[blockIndex]?.type === 'table') {
      const newParsed = [...parsed];
      const tableBlock = { ...newParsed[blockIndex] };
      tableBlock.content = {
        ...tableBlock.content,
        rows: tableBlock.content.rows.filter((_: any, idx: number) => idx !== rowIndex)
      };
      newParsed[blockIndex] = tableBlock;
      parsedMessageContent.set(messageId, newParsed);
      updateMessageContent(messageId);
    }
  }

  // Delete table column
  function deleteTableColumn(messageId: number | string, blockIndex: number, colIndex: number) {
    const parsed = parsedMessageContent.get(messageId);
    if (parsed && parsed[blockIndex]?.type === 'table') {
      const newParsed = [...parsed];
      const tableBlock = { ...newParsed[blockIndex] };
      const oldContent = tableBlock.content;
      tableBlock.content = {
        headers: oldContent.headers.filter((_: string, idx: number) => idx !== colIndex),
        rows: oldContent.rows.map((row: string[]) => 
          row.filter((_: string, idx: number) => idx !== colIndex)
        )
      };
      newParsed[blockIndex] = tableBlock;
      parsedMessageContent.set(messageId, newParsed);
      updateMessageContent(messageId);
    }
  }

  // Delete list item
  function deleteListItem(messageId: number | string, blockIndex: number, itemIndex: number) {
    const parsed = parsedMessageContent.get(messageId);
    if (parsed && (parsed[blockIndex]?.type === 'list' || parsed[blockIndex]?.type === 'checklist')) {
      const newParsed = [...parsed];
      const listBlock = { ...newParsed[blockIndex] };
      listBlock.content = listBlock.content.filter((_: any, idx: number) => idx !== itemIndex);
      
      // If list is empty, remove the entire block
      if (listBlock.content.length === 0) {
        newParsed.splice(blockIndex, 1);
      } else {
        newParsed[blockIndex] = listBlock;
      }
      
      parsedMessageContent.set(messageId, newParsed);
      updateMessageContent(messageId);
    }
  }

  // Selection management functions
  function getSelectionState(messageId: number | string, blockIndex: number, itemType: string) {
    if (!selectionState.has(messageId)) {
      selectionState.set(messageId, new Map());
    }
    const messageSelections = selectionState.get(messageId)!;
    if (!messageSelections.has(blockIndex)) {
      messageSelections.set(blockIndex, { type: itemType, selected: new Set<number>() });
    }
    const state = messageSelections.get(blockIndex)!;
    // Clear selection if switching types
    if (state.type !== itemType) {
      state.type = itemType;
      state.selected.clear();
    }
    return state;
  }

  function toggleSelection(messageId: number | string, blockIndex: number, itemIndex: number, itemType: string) {
    const state = getSelectionState(messageId, blockIndex, itemType);
    if (state.selected.has(itemIndex)) {
      state.selected.delete(itemIndex);
    } else {
      state.selected.add(itemIndex);
    }
    // Trigger reactivity
    selectionState = new Map(selectionState);
  }

  function isSelected(messageId: number | string, blockIndex: number, itemIndex: number, itemType?: string): boolean {
    const state = selectionState.get(messageId)?.get(blockIndex);
    if (!state) return false;
    // If itemType is provided, only check if types match
    if (itemType && state.type !== itemType) return false;
    return state.selected.has(itemIndex) ?? false;
  }

  function toggleSelectAll(messageId: number | string, blockIndex: number, totalItems: number, itemType: string) {
    const state = getSelectionState(messageId, blockIndex, itemType);
    const allSelected = state.selected.size === totalItems && totalItems > 0;
    if (allSelected) {
      state.selected.clear();
    } else {
      state.selected = new Set(Array.from({ length: totalItems }, (_, i) => i));
    }
    selectionState = new Map(selectionState);
  }

  function deleteSelectedItems(messageId: number | string, blockIndex: number) {
    const state = selectionState.get(messageId)?.get(blockIndex);
    if (!state || state.selected.size === 0) return;

    const parsed = parsedMessageContent.get(messageId);
    if (!parsed) return;

    const newParsed = [...parsed];
    const block = newParsed[blockIndex];

    if (block.type === 'table' && state.type === 'table-rows') {
      const tableBlock = { ...block };
      tableBlock.content = {
        ...tableBlock.content,
        rows: tableBlock.content.rows.filter((_: any, idx: number) => !state.selected.has(idx))
      };
      newParsed[blockIndex] = tableBlock;
    } else if (block.type === 'list' || block.type === 'checklist') {
      const listBlock = { ...block };
      listBlock.content = listBlock.content.filter((_: any, idx: number) => !state.selected.has(idx));
      
      if (listBlock.content.length === 0) {
        newParsed.splice(blockIndex, 1);
      } else {
        newParsed[blockIndex] = listBlock;
      }
    }

    // Clear selection
    state.selected.clear();
    parsedMessageContent.set(messageId, newParsed);
    updateMessageContent(messageId);
    selectionState = new Map(selectionState);
  }

  function deleteSelectedColumns(messageId: number | string, blockIndex: number) {
    const state = selectionState.get(messageId)?.get(blockIndex);
    if (!state || state.selected.size === 0 || state.type !== 'table-columns') return;

    const parsed = parsedMessageContent.get(messageId);
    if (!parsed || parsed[blockIndex]?.type !== 'table') return;

    const newParsed = [...parsed];
    const tableBlock = { ...newParsed[blockIndex] };
    const oldContent = tableBlock.content;
    
    tableBlock.content = {
      headers: oldContent.headers.filter((_: string, idx: number) => !state.selected.has(idx)),
      rows: oldContent.rows.map((row: string[]) => 
        row.filter((_: string, idx: number) => !state.selected.has(idx))
      )
    };
    
    // Clear selection
    state.selected.clear();
    newParsed[blockIndex] = tableBlock;
    parsedMessageContent.set(messageId, newParsed);
    updateMessageContent(messageId);
    selectionState = new Map(selectionState);
  }

  function getSelectedCount(messageId: number | string, blockIndex: number, itemType?: string): number {
    const state = selectionState.get(messageId)?.get(blockIndex);
    if (!state) return 0;
    if (itemType && state.type !== itemType) return 0;
    return state.selected.size ?? 0;
  }

  const scrollToBottom = () => {
    if (chatContainer) {
      setTimeout(() => {
        chatContainer.scrollTo({
          top: chatContainer.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  const sendMessage = async () => {
    const trimmedMessage = newMessageText.trim();
    if (trimmedMessage === '' || isLoading) return;

    // Add user message to the UI
    const userMessage: Message = {
      id: Date.now(),
      Content: trimmedMessage,
      Role: 'User'
    };
    messages = [...messages, userMessage];
    newMessageText = '';
    isLoading = true;
    scrollToBottom();

    try {
      // Send message to our SvelteKit backend
      const response = await fetch('/api/server/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: CONVERSATION_ID,
          message: trimmedMessage,
          userId: USER_ID,
          referenceMessageId: REFERENCE_MESSAGE_ID
        })
      });

      if (response.ok) {
        const result = await response.json();
        // Handle the response structure from ResponseHandler
        const content = result?.Content || result?.content || result?.message || result?.Message;
        if (content) {
          const assistantMessage: Message = {
            id: Date.now() + 1,
            Content: content,
            Role: 'Assistant'
          };
          messages = [...messages, assistantMessage];
          scrollToBottom();
        }
      } else {
        console.error('Failed to send message:', response.statusText);
        const errorMessage: Message = {
          id: Date.now() + 1,
          Content: 'Sorry, I encountered an error. Please try again.',
          Role: 'Assistant'
        };
        messages = [...messages, errorMessage];
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now() + 1,
        Content: 'Sorry, I encountered an error. Please try again.',
        Role: 'Assistant'
      };
      messages = [...messages, errorMessage];
    } finally {
      isLoading = false;
    }
  };

  const handleKeydown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const adjustTextareaHeight = () => {
    if (inputElement) {
      inputElement.style.height = 'auto';
      inputElement.style.height = `${Math.min(inputElement.scrollHeight, 200)}px`;
    }
  };

  $: if (newMessageText) {
    adjustTextareaHeight();
  }

  const newChat = () => {
    messages = [];
    newMessageText = '';
    if (inputElement) {
      inputElement.style.height = 'auto';
    }
  };
</script>

<div class="flex h-screen bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#0f0f23] font-sans antialiased overflow-hidden text-white" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;">
  <!-- Sidebar -->
  <aside 
    class="flex flex-col h-screen bg-[rgba(20,20,35,0.8)] backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-out overflow-hidden relative z-10"
    style="width: {sidebarOpen ? '280px' : '0'};"
  >
    <div class="px-5 py-6 border-b border-white/10">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-xl flex items-center justify-center text-white shadow-[0_4px_16px_rgba(255,107,53,0.3)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>
        <span class="font-bold text-lg text-white tracking-tight" style="letter-spacing: -0.02em;">Dexterous AI</span>
      </div>
    </div>
    
    <div class="flex-1 px-5 py-5 overflow-y-auto overflow-x-hidden">
      <button 
        on:click={newChat}
        class="w-full flex items-center gap-3 px-4 py-3.5 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white border-none rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 mb-8 shadow-[0_4px_12px_rgba(255,107,53,0.2)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.35)] active:translate-y-0"
        style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        <span>New Conversation</span>
      </button>
      
      <div class="mb-8">
        <h3 class="text-xs font-semibold text-white/50 uppercase mb-4 m-0" style="letter-spacing: 0.1em;">Recent Conversations</h3>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-3 px-3 py-3 rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-white/8">
            <div class="text-xl w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg">💬</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden text-ellipsis mb-1">Database Models Discussion</div>
              <div class="text-xs text-white/40">2 hours ago</div>
            </div>
          </div>
          <div class="flex items-center gap-3 px-3 py-3 rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-white/8">
            <div class="text-xl w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg">⚛️</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden text-ellipsis mb-1">React Component Help</div>
              <div class="text-xs text-white/40">Yesterday</div>
            </div>
          </div>
          <div class="flex items-center gap-3 px-3 py-3 rounded-[10px] cursor-pointer transition-all duration-200 hover:bg-white/8">
            <div class="text-xl w-9 h-9 flex items-center justify-center bg-white/5 rounded-lg">✉️</div>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-white/90 whitespace-nowrap overflow-hidden text-ellipsis mb-1">Email Writing</div>
              <div class="text-xs text-white/40">3 days ago</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="px-5 py-5 border-t border-white/10">
      <div class="flex items-center gap-3 px-3 py-3 rounded-xl transition-colors duration-200 hover:bg-white/5">
        <div class="w-11 h-11 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white rounded-full flex items-center justify-center font-semibold text-base shadow-[0_2px_8px_rgba(255,107,53,0.3)] flex-shrink-0">
          <span>T</span>
        </div>
        <div class="flex-1 min-w-0">
          <div class="font-semibold text-white text-sm whitespace-nowrap overflow-hidden text-ellipsis mb-0.5">Tushar</div>
          <div class="text-white/50 text-xs">Free Plan</div>
        </div>
        <button class="w-9 h-9 flex items-center justify-center bg-transparent border-none text-white/50 rounded-lg cursor-pointer transition-all duration-200 hover:bg-white/10 hover:text-white/90" title="Settings">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m9-9h-6m-6 0H3m15.364 6.364l-4.243-4.243m-4.242 0L5.636 18.364m12.728 0l-4.243-4.243m-4.242 0L5.636 5.636"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 flex flex-col h-screen relative overflow-hidden">
    {#if messages.length === 0}
      <!-- Welcome Screen -->
      <div class="flex flex-col items-center justify-center h-full text-center px-8 py-12 relative">
        <div class="relative mb-12">
          <div class="text-[5rem] animate-bounce drop-shadow-[0_10px_30px_rgba(255,107,53,0.3)] relative z-10">✨</div>
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] bg-gradient-radial from-[rgba(255,107,53,0.2)] to-transparent rounded-full animate-pulse"></div>
        </div>
        <div class="max-w-[600px] mb-12">
          <h1 class="text-5xl font-extrabold text-white mb-4 m-0 bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent" style="letter-spacing: -0.03em;">
            Welcome back, Tushar
          </h1>
          <p class="text-xl text-white/60 m-0 font-normal leading-relaxed">
            I'm here to help you with anything you need. What would you like to explore today?
          </p>
        </div>
        <div class="grid grid-cols-2 gap-4 max-w-[600px] w-full">
          <button class="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer transition-all duration-300 text-left hover:bg-white/8 hover:border-[rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]" style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);">
            <div class="text-2xl w-12 h-12 flex items-center justify-center bg-[rgba(255,107,53,0.1)] rounded-xl flex-shrink-0">💡</div>
            <div class="flex-1">
              <div class="font-semibold text-white text-[0.95rem] mb-1">Get Ideas</div>
              <div class="text-xs text-white/50">Brainstorm and explore</div>
            </div>
          </button>
          <button class="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer transition-all duration-300 text-left hover:bg-white/8 hover:border-[rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]" style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);">
            <div class="text-2xl w-12 h-12 flex items-center justify-center bg-[rgba(255,107,53,0.1)] rounded-xl flex-shrink-0">📝</div>
            <div class="flex-1">
              <div class="font-semibold text-white text-[0.95rem] mb-1">Write Content</div>
              <div class="text-xs text-white/50">Articles, emails, and more</div>
            </div>
          </button>
          <button class="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer transition-all duration-300 text-left hover:bg-white/8 hover:border-[rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]" style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);">
            <div class="text-2xl w-12 h-12 flex items-center justify-center bg-[rgba(255,107,53,0.1)] rounded-xl flex-shrink-0">💻</div>
            <div class="flex-1">
              <div class="font-semibold text-white text-[0.95rem] mb-1">Code Help</div>
              <div class="text-xs text-white/50">Debug and optimize</div>
            </div>
          </button>
          <button class="flex items-center gap-4 p-5 bg-white/5 border border-white/10 rounded-2xl cursor-pointer transition-all duration-300 text-left hover:bg-white/8 hover:border-[rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]" style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);">
            <div class="text-2xl w-12 h-12 flex items-center justify-center bg-[rgba(255,107,53,0.1)] rounded-xl flex-shrink-0">🎓</div>
            <div class="flex-1">
              <div class="font-semibold text-white text-[0.95rem] mb-1">Learn</div>
              <div class="text-xs text-white/50">Explain concepts</div>
            </div>
          </button>
        </div>
      </div>
    {:else}
      <!-- Chat Messages -->
      <div 
        bind:this={chatContainer}
        class="flex-1 overflow-y-auto overflow-x-hidden px-8 py-8 pb-40 scroll-smooth"
      >
        {#each messages as message, index (message.id)}
          <div class="flex gap-3 mb-6 items-start animate-[fadeInUp_0.4s_ease-out] {message.Role === 'User' ? 'justify-end' : ''}">
            {#if message.Role === 'Assistant'}
              <div class="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                  <path d="M2 17L12 22L22 17"/>
                  <path d="M2 12L12 17L22 12"/>
                </svg>
              </div>
            {/if}
            <div class="max-w-[75%] px-4 py-4 rounded-[18px] relative break-words [overflow-wrap:anywhere] backdrop-blur-md {message.Role === 'User' 
              ? 'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] rounded-br-sm shadow-[0_4px_16px_rgba(255,107,53,0.3)]' 
              : 'bg-white/8 border border-white/10 rounded-bl-sm shadow-[0_2px_8px_rgba(0,0,0,0.15)]'}">
              {#if message.Role === 'Assistant'}
                {@const parsedContent = getParsedContent(message.id, message.Content)}
                <div class="text-[0.95rem] leading-[1.7] text-white mb-2">
                  {#each parsedContent as block, blockIndex}
                    {#if block.type === 'h1'}
                      <h1 class="text-2xl font-bold mb-3 text-white border-b-2 border-[#ff6b35] pb-2 mt-4 first:mt-0">
                        {@html parseInlineFormatting(block.content)}
                      </h1>
                    
                    {:else if block.type === 'h2'}
                      <h2 class="text-xl font-semibold mt-4 mb-2 text-white first:mt-0">
                        {@html parseInlineFormatting(block.content)}
                      </h2>
                    
                    {:else if block.type === 'h3'}
                      <h3 class="text-lg font-semibold mt-3 mb-2 text-white first:mt-0">
                        {@html parseInlineFormatting(block.content)}
                      </h3>
                    
                    {:else if block.type === 'hr'}
                      <hr class="my-4 border-t border-white/20" />
                    
                    {:else if block.type === 'code'}
                      <div class="my-4 rounded-lg overflow-hidden border border-white/20 shadow-sm">
                        <div class="bg-[#1a1a2e] px-4 py-2 flex items-center justify-between">
                          <span class="text-white/60 text-sm font-mono">{block.language || 'code'}</span>
                          <button 
                            class="text-white/40 hover:text-white text-xs px-2 py-1 bg-white/5 rounded transition-colors"
                            on:click={() => {
                              navigator.clipboard.writeText(block.content);
                            }}
                          >
                            Copy
                          </button>
                        </div>
                        <pre class="bg-[#0a0a1a] p-4 overflow-x-auto"><code class="text-sm font-mono text-[#ff6b35]">{block.content}</code></pre>
                      </div>
                    
                    {:else if block.type === 'table'}
                      {@const selectedRowsCount = getSelectedCount(message.id, blockIndex, 'table-rows')}
                      {@const selectedColsCount = getSelectedCount(message.id, blockIndex, 'table-columns')}
                      {@const totalRows = block.content.rows.length}
                      {@const totalCols = block.content.headers.length}
                      <div class="overflow-x-auto my-4 rounded-lg border border-white/20 shadow-sm relative group">
                        {#if selectedRowsCount > 0}
                          <div class="absolute top-2 right-2 z-10 flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 border border-white/20">
                            <span class="text-xs text-white/80">{selectedRowsCount} row{selectedRowsCount !== 1 ? 's' : ''} selected</span>
                            <button
                              class="text-xs px-2 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors"
                              on:click={() => deleteSelectedItems(message.id, blockIndex)}
                              title="Delete selected rows"
                            >
                              Delete Selected
                            </button>
                          </div>
                        {/if}
                        <table class="min-w-full divide-y divide-white/10">
                          <thead class="bg-gradient-to-r from-[#ff6b35] to-[#f7931e]">
                            <tr>
                              <th class="px-3 py-3 text-center w-12">
                                <input
                                  type="checkbox"
                                  checked={selectedRowsCount === totalRows && totalRows > 0}
                                  on:change={() => toggleSelectAll(message.id, blockIndex, totalRows, 'table-rows')}
                                  class="w-4 h-4 text-[#ff6b35] rounded focus:ring-2 focus:ring-white/50 bg-white/20 border-white/30 cursor-pointer"
                                  title="Select all rows"
                                />
                              </th>
                              {#each block.content.headers as header, colIndex}
                                <th class="px-4 py-3 text-left font-semibold text-sm text-white tracking-wider relative group/th">
                                  <div class="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected(message.id, blockIndex, colIndex, 'table-columns')}
                                      on:change={() => toggleSelection(message.id, blockIndex, colIndex, 'table-columns')}
                                      class="w-3.5 h-3.5 text-[#ff6b35] rounded focus:ring-1 focus:ring-white/50 bg-white/20 border-white/30 cursor-pointer"
                                      title="Select column"
                                    />
                                    <span>{@html parseInlineFormatting(header)}</span>
                                    {#if block.content.headers.length > 1}
                                      <button
                                        class="opacity-0 group-hover/th:opacity-100 transition-opacity text-white/60 hover:text-white text-xs px-1.5 py-0.5 bg-white/20 hover:bg-red-500/80 rounded"
                                        on:click={() => deleteTableColumn(message.id, blockIndex, colIndex)}
                                        title="Delete column"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                          <line x1="18" y1="6" x2="6" y2="18"></line>
                                          <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                      </button>
                                    {/if}
                                  </div>
                                </th>
                              {/each}
                              <th class="px-2 py-3 text-left font-semibold text-sm text-white tracking-wider w-12"></th>
                            </tr>
                          </thead>
                          <tbody class="bg-white/5 divide-y divide-white/10">
                            {#each block.content.rows as row, rowIdx}
                              <tr class="group/row {rowIdx % 2 === 0 ? 'bg-white/5 hover:bg-white/10' : 'bg-white/3 hover:bg-white/10'} {isSelected(message.id, blockIndex, rowIdx, 'table-rows') ? 'bg-[#ff6b35]/20' : ''}" style="transition-colors duration-150;">
                                <td class="px-3 py-3 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected(message.id, blockIndex, rowIdx, 'table-rows')}
                                    on:change={() => toggleSelection(message.id, blockIndex, rowIdx, 'table-rows')}
                                    class="w-4 h-4 text-[#ff6b35] rounded focus:ring-2 focus:ring-white/50 bg-white/20 border-white/30 cursor-pointer"
                                  />
                                </td>
                                {#each row as cell}
                                  <td class="px-4 py-3 text-sm text-white/90 whitespace-nowrap">
                                    {@html parseInlineFormatting(cell)}
                                  </td>
                                {/each}
                                <td class="px-2 py-3">
                                  <button
                                    class="opacity-0 group-hover/row:opacity-100 transition-opacity text-white/60 hover:text-red-400 text-xs px-2 py-1 bg-white/10 hover:bg-red-500/20 rounded"
                                    on:click={() => deleteTableRow(message.id, blockIndex, rowIdx)}
                                    title="Delete row"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            {/each}
                          </tbody>
                        </table>
                        {#if selectedColsCount > 0}
                          <div class="absolute bottom-2 right-2 z-10">
                            <button
                              class="text-xs px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors"
                              on:click={() => deleteSelectedColumns(message.id, blockIndex)}
                              title="Delete selected columns"
                            >
                              Delete Selected Columns ({selectedColsCount})
                            </button>
                          </div>
                        {/if}
                      </div>
                    
                    {:else if block.type === 'checklist'}
                      {@const selectedCount = getSelectedCount(message.id, blockIndex)}
                      {@const totalItems = block.content.length}
                      <div class="my-3 space-y-2">
                        {#if selectedCount > 0}
                          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                            <span class="text-xs text-white/80">{selectedCount} selected</span>
                            <button
                              class="text-xs px-2 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors"
                              on:click={() => deleteSelectedItems(message.id, blockIndex)}
                              title="Delete selected items"
                            >
                              Delete Selected
                            </button>
                          </div>
                        {/if}
                        <div class="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedCount === totalItems && totalItems > 0}
                            on:change={() => toggleSelectAll(message.id, blockIndex, totalItems, 'checklist')}
                            class="w-4 h-4 text-[#ff6b35] rounded focus:ring-2 focus:ring-white/50 bg-white/20 border-white/30 cursor-pointer"
                            title="Select all"
                          />
                          <span class="text-xs text-white/60">Select all</span>
                        </div>
                        <ul class="space-y-2">
                          {#each block.content as item, itemIndex}
                            <li class="flex items-start gap-3 group/item {isSelected(message.id, blockIndex, itemIndex) ? 'bg-[#ff6b35]/10 rounded px-2 py-1' : ''}">
                              <input 
                                type="checkbox" 
                                checked={item.checked}
                                class="mt-1 w-4 h-4 text-[#ff6b35] rounded focus:ring-2 focus:ring-[#ff6b35] bg-white/10 border-white/20"
                                disabled
                              />
                              <input
                                type="checkbox"
                                checked={isSelected(message.id, blockIndex, itemIndex)}
                                on:change={() => toggleSelection(message.id, blockIndex, itemIndex, 'checklist')}
                                class="mt-1 w-4 h-4 text-[#ff6b35] rounded focus:ring-2 focus:ring-white/50 bg-white/20 border-white/30 cursor-pointer"
                                title="Select item"
                              />
                              <span class={item.checked ? 'text-white/50 line-through flex-1' : 'text-white/90 flex-1'}>
                                {@html parseInlineFormatting(item.text)}
                              </span>
                              <button
                                class="opacity-0 group-hover/item:opacity-100 transition-opacity text-white/60 hover:text-red-400 text-xs px-2 py-1 bg-white/10 hover:bg-red-500/20 rounded ml-2"
                                on:click={() => deleteListItem(message.id, blockIndex, itemIndex)}
                                title="Delete item"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </li>
                          {/each}
                        </ul>
                      </div>
                    
                    {:else if block.type === 'list'}
                      {@const selectedCount = getSelectedCount(message.id, blockIndex)}
                      {@const totalItems = block.content.length}
                      <div class="my-3 space-y-2">
                        {#if selectedCount > 0}
                          <div class="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                            <span class="text-xs text-white/80">{selectedCount} selected</span>
                            <button
                              class="text-xs px-2 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors"
                              on:click={() => deleteSelectedItems(message.id, blockIndex)}
                              title="Delete selected items"
                            >
                              Delete Selected
                            </button>
                          </div>
                        {/if}
                        <div class="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedCount === totalItems && totalItems > 0}
                            on:change={() => toggleSelectAll(message.id, blockIndex, totalItems, 'list')}
                            class="w-4 h-4 text-[#ff6b35] rounded focus:ring-2 focus:ring-white/50 bg-white/20 border-white/30 cursor-pointer"
                            title="Select all"
                          />
                          <span class="text-xs text-white/60">Select all</span>
                        </div>
                        <ul class="space-y-2">
                          {#each block.content as item, itemIndex}
                            <li class="flex items-start gap-3 group/item {isSelected(message.id, blockIndex, itemIndex) ? 'bg-[#ff6b35]/10 rounded px-2 py-1' : ''}" style="padding-left: {item.indent * 1.5}rem">
                              <input
                                type="checkbox"
                                checked={isSelected(message.id, blockIndex, itemIndex)}
                                on:change={() => toggleSelection(message.id, blockIndex, itemIndex, 'list')}
                                class="mt-1.5 w-4 h-4 text-[#ff6b35] rounded focus:ring-2 focus:ring-white/50 bg-white/20 border-white/30 cursor-pointer"
                                title="Select item"
                              />
                              <span class="text-[#ff6b35] mt-1.5">●</span>
                              <span class="text-white/90 flex-1">{@html parseInlineFormatting(item.text)}</span>
                              <button
                                class="opacity-0 group-hover/item:opacity-100 transition-opacity text-white/60 hover:text-red-400 text-xs px-2 py-1 bg-white/10 hover:bg-red-500/20 rounded ml-2"
                                on:click={() => deleteListItem(message.id, blockIndex, itemIndex)}
                                title="Delete item"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                  <line x1="18" y1="6" x2="6" y2="18"></line>
                                  <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                              </button>
                            </li>
                          {/each}
                        </ul>
                      </div>
                    
                    {:else if block.type === 'p'}
                      <p class="my-2 text-white/90 leading-relaxed">
                        {@html parseInlineFormatting(block.content)}
                      </p>
                    {/if}
                  {/each}
                </div>
              {:else}
                <div class="text-[0.95rem] leading-[1.7] text-white mb-2 whitespace-pre-wrap">{message.Content}</div>
              {/if}
              <div class="text-[0.7rem] text-white/40 mt-2">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            {#if message.Role === 'User'}
              <div class="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-white/10 text-white font-semibold text-sm border-2 border-white/20">
                <span>T</span>
              </div>
            {/if}
          </div>
        {/each}
        
        {#if isLoading}
          <div class="flex gap-3 mb-6 items-start animate-[fadeInUp_0.4s_ease-out]">
            <div class="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
                <path d="M2 17L12 22L22 17"/>
                <path d="M2 12L12 17L22 12"/>
              </svg>
            </div>
            <div class="px-4 py-4 bg-white/8 border border-white/10 rounded-[18px] rounded-bl-sm backdrop-blur-md inline-block shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
              <div class="flex gap-2 items-center">
                <span class="w-2 h-2 bg-white/60 rounded-full animate-[typing_1.4s_infinite_ease-in-out]" style="animation-delay: -0.32s;"></span>
                <span class="w-2 h-2 bg-white/60 rounded-full animate-[typing_1.4s_infinite_ease-in-out]" style="animation-delay: -0.16s;"></span>
                <span class="w-2 h-2 bg-white/60 rounded-full animate-[typing_1.4s_infinite_ease-in-out]"></span>
              </div>
            </div>
          </div>
        {/if}
      </div>
    {/if}

    <!-- Input Area -->
    <div class="absolute bottom-0 left-0 right-0 px-8 py-6 backdrop-blur-xl border-t transition-all duration-300 {inputFocused ? 'border-[rgba(255,107,53,0.3)]' : 'border-white/10'}" style="background: linear-gradient(180deg, transparent 0%, rgba(10, 10, 26, 0.95) 20%, rgba(10, 10, 26, 0.98) 100%);">
      <div class="flex items-end gap-3 bg-white/5 border-2 rounded-[24px] px-4 py-3.5 transition-all duration-300 max-w-[1000px] mx-auto {inputFocused ? 'border-[rgba(255,107,53,0.4)] shadow-[0_0_0_4px_rgba(255,107,53,0.1)] bg-white/8' : 'border-white/10'}" style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);">
        <button 
          class="flex items-center justify-center w-10 h-10 bg-transparent text-white/50 border-none rounded-[10px] cursor-pointer transition-all duration-200 flex-shrink-0 hover:bg-white/10 hover:text-white/90"
          title="Attach file"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
          </svg>
        </button>
        
        <div class="flex-1 flex flex-col min-w-0">
          <textarea
            bind:this={inputElement}
            bind:value={newMessageText}
            on:keydown={handleKeydown}
            on:input={adjustTextareaHeight}
            on:focus={() => inputFocused = true}
            on:blur={() => inputFocused = false}
            placeholder="Type your message here..."
            class="flex-1 border-none outline-none resize-none text-[0.95rem] leading-relaxed text-white bg-transparent min-h-6 max-h-[200px] overflow-y-auto py-1"
            style="line-height: 1.6; font-family: inherit;"
            disabled={isLoading}
            rows="1"
          ></textarea>
          <div class="mt-1">
            <span class="text-[0.7rem] text-white/30">Press Enter to send, Shift+Enter for new line</span>
          </div>
        </div>
        
        <div class="flex items-center gap-3 ml-2">
          <select class="bg-white/10 text-white border border-white/20 rounded-[10px] px-3 py-2 text-xs cursor-pointer transition-all duration-200 outline-none hover:bg-white/15 focus:border-[#ff6b35]">
            <option class="bg-[#1a1a2e] text-white">Claude Sonnet 4.5</option>
            <option class="bg-[#1a1a2e] text-white">GPT-4 Turbo</option>
            <option class="bg-[#1a1a2e] text-white">Claude 3.5 Opus</option>
          </select>
          
          <button
            on:click={sendMessage}
            disabled={!newMessageText.trim() || isLoading}
            class="flex items-center justify-center w-11 h-11 border-none rounded-xl transition-all duration-200 flex-shrink-0 {newMessageText.trim() && !isLoading 
              ? 'bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white cursor-pointer shadow-[0_4px_12px_rgba(255,107,53,0.3)] hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)] active:translate-y-0 active:scale-100' 
              : 'bg-white/10 text-white/50 cursor-not-allowed'}"
            style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
            title="Send message"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22,2 15,22 11,13 2,9 22,2"/>
            </svg>
          </button>
        </div>
      </div>
      
      <p class="mt-4 text-center text-xs text-white/40 flex items-center justify-center gap-2 max-w-[1000px] mx-auto">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        AI can make mistakes. Please verify important information.
      </p>
    </div>
  </main>
</div>

<style>
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(15px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes typing {
    0%, 80%, 100% {
      transform: scale(0.8);
      opacity: 0.5;
    }
    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  :global(::-webkit-scrollbar) {
    width: 8px;
  }

  :global(::-webkit-scrollbar-track) {
    background: rgba(255, 255, 255, 0.05);
  }

  :global(::-webkit-scrollbar-thumb) {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  :global(::-webkit-scrollbar-thumb:hover) {
    background: rgba(255, 255, 255, 0.3);
  }

  :global(textarea::placeholder) {
    color: rgba(255, 255, 255, 0.4);
  }

  :global(select option) {
    background: #1a1a2e;
    color: #ffffff;
  }
</style>
