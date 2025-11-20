import type { PageServerLoad } from './$types.ts';
import { getConversationMessagesById } from '../../../api/services/conversation.service';
import type { Conversation } from '$lib/types/botTypes';

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.userId;
	const conversationId = '98b6495b-01fe-445f-804e-c20e1d3ba2d0'; // Static conversation ID
	
	try {
		// Call getConversationMessagesById to get messages
		const messages = await getConversationMessagesById(conversationId);
		
		// Build conversations list from messages by grouping by ConversationId
		const conversationMap = new Map<string, Conversation>();
		
		if (Array.isArray(messages) && messages.length > 0) {
			messages.forEach((msg: any) => {
				const convId = msg.ConversationId || conversationId;
				
				if (!conversationMap.has(convId)) {
					// Create new conversation object from message data
					conversationMap.set(convId, {
						id: convId,
						title: `Conversation ${convId.substring(0, 8)}`,
						userId: userId,
						botId: 'default-bot', // Default bot ID
						createdAt: msg.CreatedAt || new Date().toISOString(),
						updatedAt: msg.CreatedAt || new Date().toISOString(),
						status: 'active' as const
					});
				} else {
					// Update conversation with latest message date
					const conv = conversationMap.get(convId)!;
					if (msg.CreatedAt && new Date(msg.CreatedAt) > new Date(conv.updatedAt)) {
						conv.updatedAt = msg.CreatedAt;
					}
				}
			});
		}
		
		// Convert map to array and sort by updatedAt
		const conversations = Array.from(conversationMap.values()).sort((a, b) => {
			return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
		});
		
		console.log('Loaded conversations from messages:', conversations);
		return {
			userId,
			conversations: conversations || []
		};
	} catch (error) {
		console.error('Error loading conversations:', error);
		return {
			userId,
			conversations: []
		};
	}
};

