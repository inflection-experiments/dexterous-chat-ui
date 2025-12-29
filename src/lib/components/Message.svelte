<script lang="ts">
	import type { Message } from '$lib/types/chat';
	import Icon from '@iconify/svelte';
	import MessageContent from './MessageContent.svelte';
	import StructuredMessageContent from './StructuredMessageContent.svelte';

	let {
		message,
		userId,
		parsedContent,
		selectionState,
		onButtonAction,
		onDeleteRow,
		onDeleteItem,
		onSaveSelected,
		// onDropdownChange
	}: {
		message: Message;
		userId: string;
		parsedContent: any[];
		selectionState: any;
		onButtonAction: (button: any, messageId: number | string) => void;
		onDeleteRow: (messageId: number | string, blockIndex: number, rowIndex: number) => void;
		onDeleteItem: (messageId: number | string, blockIndex: number, itemIndex: number) => void;
		onSaveSelected: () => void;
		// onDropdownChange?: (dropdown: any, selectedValue: string, messageId: number | string) => void;
		// onRadioChange?: (radioGroup: any, selectedValue: string, messageId: number | string) => void;
	} = $props();

	const isUser = message.Role === 'User';
	const useStructured = !isUser && message.StructuredResponse;
</script>

<div
	class="mb-6 flex animate-[fadeInUp_0.4s_ease-out] items-start gap-3 {isUser ? 'justify-end' : ''}"
>
	{#if !isUser}
		<!-- Assistant Avatar -->
		<div
			class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)]"
		>
			<Icon icon="mdi:layers" width="20" height="20" />
		</div>
	{/if}

	<!-- Message Content -->
	<div class="relative max-w-[75%] {isUser ? '' : 'min-w-0 flex-1'}">
		{#if isUser}
			<div
				class="rounded-[18px] rounded-br-sm bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-4 py-4 [overflow-wrap:anywhere] break-words shadow-[0_4px_16px_rgba(255,107,53,0.3)] backdrop-blur-md"
			>
				<p class="m-0 mb-2 text-[0.95rem] leading-[1.7] break-words whitespace-pre-wrap text-white">
					{message.Content}
				</p>
				<div class="mt-2 text-[0.7rem] text-white/40">
					{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				</div>
			</div>
		{:else}
			<div
				class="rounded-[18px] rounded-bl-sm border border-white/10 bg-white/8 px-4 py-4 shadow-[0_2px_8px_rgba(0,0,0,0.15)] backdrop-blur-md"
			>
				{#if useStructured && message.StructuredResponse}
					<StructuredMessageContent
						structuredResponse={message.StructuredResponse}
						messageId={message.id}
						{selectionState}
						{onButtonAction}
						{onDeleteRow}
						{onDeleteItem}
						{onSaveSelected}
					/>
				{:else}
					<MessageContent
						messageId={message.id}
						{parsedContent}
						{selectionState}
						{onButtonAction}
						{onDeleteRow}
						{onDeleteItem}
						{onSaveSelected}
					/>
				{/if}
				<div class="mt-2 text-[0.7rem] text-white/40">
					{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
				</div>
			</div>
		{/if}
	</div>

	{#if isUser}
		<!-- User Avatar -->
		<div
			class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px] border-2 border-white/20 bg-white/10 text-sm font-semibold text-white"
		>
			{userId.charAt(0).toUpperCase()}
		</div>
	{/if}
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
