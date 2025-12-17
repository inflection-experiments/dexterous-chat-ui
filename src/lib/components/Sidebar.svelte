<!-- lib/components/Sidebar.svelte -->
<script lang="ts">
	import type { Conversation } from '$lib/types/botTypes';
	import Icon from '@iconify/svelte';
	import { formatDate, truncateText } from '$lib/utils/ChatUtils';

	let {
		open,
		conversations,
		selectedId,
		conversationTitles,
		userId,
		loadingConversations,
		onNewChat,
		onSelectConversation,
		onDeleteConversation
	}: {
		open: boolean;
		conversations: Conversation[];
		selectedId: string;
		conversationTitles: Map<string, string>;
		userId: string;
		loadingConversations: boolean;
		onNewChat: () => void;
		onSelectConversation: (id: string) => void;
		onDeleteConversation: (id: string) => void;
	} = $props();
</script>

<aside
	class="relative z-10 flex h-screen flex-col overflow-hidden border-r border-white/10 bg-[rgba(20,20,35,0.8)] backdrop-blur-xl transition-all duration-300 ease-out"
	style="width: {open ? '360px' : '0'};"
>
	<!-- Header -->
	<div class="border-b border-white/10 px-5 py-6">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_16px_rgba(255,107,53,0.3)]">
				<Icon icon="mdi:layers" width="24" height="24" />
			</div>
			<span class="text-lg font-bold tracking-tight text-white" style="letter-spacing: -0.02em;">Dexterous AI</span>
		</div>
	</div>

	<!-- Content -->
	<div class="flex-1 overflow-x-hidden overflow-y-auto px-5 py-5">
		<button
			onclick={onNewChat}
			class="mb-8 flex w-full cursor-pointer items-center gap-3 rounded-xl border-none bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.35)] active:translate-y-0"
		>
			<Icon icon="mdi:plus" width="18" height="18" />
			<span>New Conversation</span>
		</button>

		<div class="mb-8">
			<h3 class="m-0 mb-4 text-xs font-semibold text-white/50 uppercase" style="letter-spacing: 0.1em;">
				Recent Conversations
			</h3>
			
			{#if loadingConversations}
				<div class="text-sm text-white/40">Loading...</div>
			{:else if conversations.length === 0}
				<div class="text-sm text-white/40">No conversations yet</div>
			{:else}
				<div class="flex flex-col gap-2">
					{#each conversations as conversation (conversation.id)}
						<div class="group relative flex w-full items-center gap-2 rounded-[10px] transition-all duration-200 hover:bg-white/8 {selectedId === conversation.id ? 'bg-white/10' : ''}">
							<button
								onclick={() => onSelectConversation(conversation.id)}
								class="flex flex-1 cursor-pointer items-center gap-3 px-3 py-3 text-left"
							>
								<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 text-xl">
									💬
								</div>
								<div class="min-w-0 flex-1">
									<div class="mb-1 overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-white/90"
										title={conversationTitles.get(conversation.id) || conversation.id}
									>
										{conversationTitles.get(conversation.id) 
											? truncateText(conversationTitles.get(conversation.id), 30)
											: 'New conversation'}
									</div>
									<div class="text-xs text-white/40">
										{formatDate((conversation as any).createdAt || (conversation as any).CreatedAt)}
									</div>
								</div>
							</button>
							<button
								onclick={(e) => {
									e.stopPropagation();
									onDeleteConversation(conversation.id);
								}}
								class="absolute right-2 rounded-lg bg-red-500/20 p-1.5 text-red-400 opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:bg-red-500/30"
								title="Delete conversation"
							>
								<Icon icon="mdi:delete-outline" width="18" height="18" />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Footer -->
	<div class="border-t border-white/10 px-5 py-5">
		<div class="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-200 hover:bg-white/5">
			<div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-base font-semibold text-white shadow-[0_2px_8px_rgba(255,107,53,0.3)]">
				<span>{userId.charAt(0).toUpperCase()}</span>
			</div>
			<div class="min-w-0 flex-1">
				<div class="mb-0.5 overflow-hidden text-sm font-semibold text-ellipsis whitespace-nowrap text-white">
					User {userId.substring(0, 8)}
				</div>
				<div class="text-xs text-white/50">User ID</div>
			</div>
		</div>
	</div>
</aside>