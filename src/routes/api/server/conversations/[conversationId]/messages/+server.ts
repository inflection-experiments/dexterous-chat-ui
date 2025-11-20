import { json, type RequestEvent } from '@sveltejs/kit';
import { getConversationMessagesById } from '../../../../services/conversation.service';

export const GET = async (event: RequestEvent) => {
	try {
		const conversationId = event.params.conversationId;

		if (!conversationId) {
			return json({ error: 'conversationId is required' }, { status: 400 });
		}

		const messages = await getConversationMessagesById(conversationId);
		return json({ messages });
	} catch (error) {
		console.error('Error in conversation messages API server endpoint:', error);
		return json({ error: 'Failed to fetch messages' }, { status: 500 });
	}
};

