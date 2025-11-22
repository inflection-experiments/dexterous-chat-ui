<script lang="ts">
    import type { Message } from '$lib/types/chat.ts';
    import Icon from '@iconify/svelte';
  
    const CONVERSATION_ID = '98b6495b-01fe-445f-804e-c20e1d3ba2d0';
    const USER_ID = '74f22a5f-8ed2-45ce-af2e-ac4c32d824f4';
    const REFERENCE_MESSAGE_ID = '123e4567-e89b-12d3-a456-426655440000';
  
    let messages = $state<Message[]>([]);
    let newMessageText = $state('');
    let chatContainer = $state<HTMLElement | null>(null);
    let inputElement = $state<HTMLTextAreaElement | null>(null);
    let isLoading = $state(false);
    let sidebarOpen = $state(true);
    let inputFocused = $state(false);
  
    const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
      if (chatContainer) {
        // small delay to ensure DOM has updated
        setTimeout(() => {
          chatContainer.scrollTo({
            top: chatContainer.scrollHeight,
            behavior
          });
        }, 50);
      }
    };
  
    const sendMessage = async () => {
      const trimmedMessage = newMessageText.trim();
      if (trimmedMessage === '' || isLoading) return;
  
      // push user message (immediate UI feedback)
      const userMessage: Message = {
        id: Date.now(),
        Content: trimmedMessage,
        Role: 'User'
      };
      messages = [...messages, userMessage];
      newMessageText = '';
      isLoading = true;
      scrollToBottom('auto');
  
      try {
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
          const content = result?.Content || result?.content || result?.message || result?.Message;
          if (content) {
            const assistantMessage: Message = {
              id: Date.now() + 1,
              Content: content,
              Role: 'Assistant'
            };
            messages = [...messages, assistantMessage];
            scrollToBottom();
          } else {
            const assistantMessage: Message = {
              id: Date.now() + 1,
              Content: 'Received an unexpected response structure.',
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
          scrollToBottom();
        }
      } catch (error) {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          id: Date.now() + 1,
          Content: 'Sorry, I encountered an error. Please try again.',
          Role: 'Assistant'
        };
        messages = [...messages, errorMessage];
        scrollToBottom();
      } finally {
        isLoading = false;
        // keep focus on input
        inputElement?.focus();
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
        inputElement.style.height = '0px';
        const scrollH = Math.min(inputElement.scrollHeight, 200);
        inputElement.style.height = scrollH + 'px';
      }
    };
  
    $effect(() => {
      if (newMessageText) adjustTextareaHeight();
    });

    // when messages array changes, scroll to bottom
    $effect(() => {
      // reactive to messages length change
      const len = messages.length;
      if (len > 0) {
        scrollToBottom();
      }
    });
  
    const newChat = () => {
      messages = [];
      newMessageText = '';
      if (inputElement) inputElement.style.height = '0px';
      // small timeout to allow UI to settle
      setTimeout(() => inputElement?.focus(), 50);
    };
  
    const toggleSidebar = () => {
      sidebarOpen = !sidebarOpen;
    };
  </script>
  
  <!-- Root layout -->
  <div class="min-h-screen flex bg-[#0b0b0d] text-white antialiased">
    <!-- Sidebar -->
    <aside class="flex flex-col transition-all duration-300 ease-out z-20"
           style="width: {sidebarOpen ? '280px' : '72px'};">
      <div class="h-full flex flex-col">
        <!-- Top area / logo -->
        <div class="flex items-center gap-3 px-4 py-4">
          <button
            class="w-10 h-10 flex items-center justify-center rounded-lg bg-white/6 hover:bg-white/8 transition"
            onclick={toggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            {#if sidebarOpen}
              <!-- collapse icon -->
              <Icon icon="mdi:chevron-right" class="w-5 h-5" />
            {:else}
              <!-- expand icon -->
              <Icon icon="mdi:chevron-left" class="w-5 h-5" />
            {/if}
          </button>
  
          {#if sidebarOpen}
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 bg-gradient-to-br from-white/4 to-white/6 rounded-lg flex items-center justify-center text-sm font-semibold">
                <span class="text-[#e6e6e6]">DA</span>
              </div>
              <div class="flex flex-col">
                <div class="text-sm font-semibold">Dexterous AI</div>
                <div class="text-xs text-white/40">Pro</div>
              </div>
            </div>
          {/if}
        </div>
  
        <!-- New conversation button -->
        <div class="px-4">
          <button
            onclick={newChat}
            class="w-full flex items-center gap-3 px-3 py-3 rounded-lg bg-white/5 hover:bg-white/6 transition text-sm"
          >
            <Icon icon="mdi:plus" class="w-5 h-5 text-white/80" />
            {#if sidebarOpen}<span>New conversation</span>{/if}
          </button>
        </div>
  
        <!-- Conversations list -->
        <div class="flex-1 overflow-auto px-2 py-4 space-y-2">
          <!-- header -->
          {#if sidebarOpen}
            <div class="px-3 text-xs text-white/40 uppercase tracking-wider">Recent</div>
          {/if}
  
          <!-- sample items (you can bind these to real data later) -->
          <div class="mt-2 space-y-2 px-2">
            <div class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/4 transition cursor-pointer">
              <div class="w-9 h-9 rounded-md bg-white/6 flex items-center justify-center">💬</div>
              {#if sidebarOpen}
                <div class="min-w-0">
                  <div class="text-sm truncate">Database Models Discussion</div>
                  <div class="text-xs text-white/40 truncate">2 hours ago</div>
                </div>
              {/if}
            </div>
  
            <div class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/4 transition cursor-pointer">
              <div class="w-9 h-9 rounded-md bg-white/6 flex items-center justify-center">⚛️</div>
              {#if sidebarOpen}
                <div class="min-w-0">
                  <div class="text-sm truncate">React Component Help</div>
                  <div class="text-xs text-white/40 truncate">Yesterday</div>
                </div>
              {/if}
            </div>
          </div>
        </div>
  
        <!-- User summary / bottom -->
        <div class="px-4 py-4 border-t border-white/4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-md bg-white/6 flex items-center justify-center">T</div>
            {#if sidebarOpen}
              <div class="flex-1">
                <div class="text-sm font-semibold">Tushar</div>
                <div class="text-xs text-white/40">Free plan</div>
              </div>
              <button class="px-2 py-1 text-xs bg-white/6 rounded hover:bg-white/8">Manage</button>
            {/if}
          </div>
        </div>
      </div>
    </aside>
  
    <!-- Main area -->
    <main class="flex-1 flex flex-col relative">
      <!-- Top header -->
      <header class="flex items-center justify-between px-6 py-4 border-b border-white/6 bg-gradient-to-b from-transparent to-white/2">
        <div class="flex items-center gap-4">
          <div class="text-sm text-white/60">Conversation</div>
          <div class="text-sm font-semibold">Project Chat</div>
        </div>
  
        <div class="flex items-center gap-3 text-sm text-white/50">
          <button class="px-3 py-2 rounded-md hover:bg-white/4 transition">Share</button>
          <button class="px-3 py-2 rounded-md hover:bg-white/4 transition">Settings</button>
        </div>
      </header>
  
      <!-- Content area -->
      <div class="flex-1 overflow-hidden relative">
        {#if messages.length === 0}
          <!-- Empty / welcome -->
          <div class="h-full flex items-center justify-center">
            <div class="max-w-2xl text-center px-6">
              <div class="mb-6">
                <div class="inline-flex items-center justify-center w-24 h-24 rounded-full bg-white/6 mx-auto">
                  <Icon icon="mdi:emoticon-happy" class="w-10 h-10 text-white/90" />
                </div>
              </div>
  
              <h1 class="text-2xl font-semibold mb-2">Welcome back, Tushar</h1>
              <p class="text-sm text-white/50 mb-6">Ask anything — code help, writing, brainstorming. I'm ready.</p>
  
              <div class="flex items-center justify-center gap-3">
                <button class="px-4 py-2 rounded-md bg-white/6 hover:bg-white/8" onclick={() => { newMessageText = 'Help me write a SQL migration'; inputElement?.focus(); }}>
                  Try prompt
                </button>
                <button class="px-4 py-2 rounded-md bg-white/6 hover:bg-white/8" onclick={() => { newMessageText = 'Generate a form with drag and drop components'; inputElement?.focus(); }}>
                  Form builder prompt
                </button>
              </div>
            </div>
          </div>
        {:else}
          <!-- Messages list -->
          <div
            bind:this={chatContainer}
            class="h-full overflow-y-auto px-6 py-6 pb-40 space-y-6"
            onclick={() => inputElement?.focus()}
          >
            {#each messages as message (message.id)}
              <div class="flex items-start gap-4 {message.Role === 'User' ? 'justify-end' : 'justify-start'}">
                {#if message.Role === 'Assistant'}
                  <!-- assistant avatar -->
                  <div class="flex-shrink-0 w-10 h-10 rounded-md bg-white/6 flex items-center justify-center">
                    <Icon icon="mdi:layers" class="w-5 h-5 text-white/85" />
                  </div>
                {/if}
  
                <div class="max-w-[75%]">
                  <div class="px-4 py-3 rounded-2xl break-words whitespace-pre-wrap text-sm leading-relaxed
                              {message.Role === 'User'
                                ? 'ml-auto bg-[#2563eb] text-white rounded-br-md rounded-bl-2xl rounded-tl-2xl'
                                : 'bg-white/6 text-white/95 rounded-bl-md rounded-tr-2xl rounded-tl-2xl border border-white/6'}">
                    {message.Content}
                  </div>
                  <div class="text-xs text-white/30 mt-2 text-right">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
  
                {#if message.Role === 'User'}
                  <!-- user avatar -->
                  <div class="flex-shrink-0 w-10 h-10 rounded-md bg-white/10 flex items-center justify-center font-semibold text-sm">
                    <span>T</span>
                  </div>
                {/if}
              </div>
            {/each}
  
            {#if isLoading}
              <div class="flex items-start gap-4">
                <div class="flex-shrink-0 w-10 h-10 rounded-md bg-white/6 flex items-center justify-center">
                  <Icon icon="mdi:layers" class="w-5 h-5 text-white/85" />
                </div>
  
                <div>
                  <div class="px-4 py-3 rounded-2xl bg-white/6 text-sm">
                    <div class="flex gap-2 items-center">
                      <span class="w-2 h-2 rounded-full bg-white/80 animate-ping"></span>
                      <span class="w-2 h-2 rounded-full bg-white/80 animate-ping" style="animation-delay: 0.12s;"></span>
                      <span class="w-2 h-2 rounded-full bg-white/80 animate-ping" style="animation-delay: 0.24s;"></span>
                      <span class="ml-2 text-xs text-white/60">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}
      </div>
  
      <!-- Input area (floating) -->
      <div class="absolute left-0 right-0 bottom-0 px-6 pb-6">
        <div class="mx-auto max-w-[980px]">
          <div class="bg-gradient-to-b from-transparent to-transparent">
            <div class="flex items-end gap-3 bg-white/4 backdrop-blur-sm border border-white/6 rounded-3xl px-4 py-3">
              <button class="w-10 h-10 rounded-lg bg-transparent flex items-center justify-center hover:bg-white/6 transition" title="Attach">
                <Icon icon="mdi:paperclip" class="w-5 h-5" />
              </button>
  
              <div class="flex-1">
                <textarea
                  bind:this={inputElement}
                  bind:value={newMessageText}
                  onkeydown={handleKeydown}
                  oninput={adjustTextareaHeight}
                  onfocus={() => inputFocused = true}
                  onblur={() => inputFocused = false}
                  placeholder="Type a message — press Enter to send"
                  class="w-full resize-none bg-transparent border-none outline-none text-sm text-white placeholder-white/40 leading-relaxed max-h-[200px] overflow-y-auto"
                  rows="1"
                  disabled={isLoading}
                />
                <div class="text-xs text-white/30 mt-2 hidden sm:block">Shift+Enter for newline • Press Enter to send</div>
              </div>
  
              <div class="flex items-center gap-3">
                <select class="bg-transparent text-white/85 border border-white/6 rounded-md px-3 py-2 text-xs outline-none">
                  <option>GPT-4 Turbo</option>
                  <option>Claude 3.5</option>
                  <option>Claude Sonnet</option>
                </select>
  
                <button
                  onclick={sendMessage}
                  disabled={!newMessageText.trim() || isLoading}
                  class="w-11 h-11 rounded-lg flex items-center justify-center transition
                        {newMessageText.trim() && !isLoading ? 'bg-white text-[#0b0b0d] hover:scale-[1.03]' : 'bg-white/6 text-white/50 cursor-not-allowed'}"
                  title="Send"
                >
                  <Icon icon="mdi:send" class="w-5 h-5" />
                </button>
              </div>
            </div>
  
            <p class="text-center text-xs text-white/30 mt-3">AI can make mistakes — verify important information.</p>
          </div>
        </div>
      </div>
    </main>
  </div>
  
  <style>
    /* small custom keyframes to gently show/hide */
    @keyframes subtle-fade-in {
      from { opacity: 0; transform: translateY(6px); }
      to { opacity: 1; transform: translateY(0); }
    }
    :global(.animate-subtle) {
      animation: subtle-fade-in 240ms ease-out;
    }
  
    /* adjust textarea placeholder opacity across browsers */
    textarea::placeholder { opacity: 0.6; }
    textarea::-webkit-input-placeholder { opacity: 0.6; }
    textarea::-moz-placeholder { opacity: 0.6; }
  </style>
