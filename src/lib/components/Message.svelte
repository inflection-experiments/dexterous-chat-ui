<!-- lib/components/Message.svelte -->
<script lang="ts">
	import type { Message } from '$lib/types/chat';
	import Icon from '@iconify/svelte';
	import MessageContent from './MessageContent.svelte';

	let {
		message,
		userId,
		parsedContent,
		selectionState,
		onButtonAction,
		onDeleteRow,
		onDeleteItem,
		onSaveSelected
	}: {
		message: Message;
		userId: string;
		parsedContent: any[];
		selectionState: any;
		onButtonAction: (button: any, messageId: number | string) => void;
		onDeleteRow: (messageId: number | string, blockIndex: number, rowIndex: number) => void;
		onDeleteItem: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
		onSaveSelected: () => void;
	} = $props();

	const isUser = message.Role === 'User';
</script>

<div class="mb-6 flex animate-[fadeInUp_0.4s_ease-out] items-start gap-3">
	<!-- Avatar -->
	{#if isUser}
		<div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue-500 to-blue-600 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)]">
			{userId.charAt(0).toUpperCase()}
		</div>
	{:else}
		<div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]">
			<Icon icon="mdi:layers" width="20" height="20" />
		</div>
	{/if}

	<!-- Message Content -->
	<div class="min-w-0 flex-1">
		<div class="mb-1.5 text-xs font-semibold uppercase tracking-wider {isUser ? 'text-blue-400' : 'text-[#ff6b35]'}">
			{message.Role}
		</div>
		
		{#if isUser}
			<div class="inline-block max-w-full rounded-[18px] rounded-tl-sm border border-blue-500/20 bg-blue-500/10 px-4 py-3 shadow-[0_2px_8px_rgba(59,130,246,0.1)] backdrop-blur-md">
				<p class="m-0 whitespace-pre-wrap break-words text-[0.95rem] leading-[1.7] text-white/90">
					{message.Content}
				</p>
			</div>
		{:else}
			<div class="inline-block max-w-full rounded-[18px] rounded-tl-sm border border-white/10 bg-white/8 px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-md">
				<MessageContent
					messageId={message.id}
					{parsedContent}
					{selectionState}
					{onButtonAction}
					{onDeleteRow}
					{onDeleteItem}
					{onSaveSelected}
				/>
			</div>
		{/if}
	</div>
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
</style>

