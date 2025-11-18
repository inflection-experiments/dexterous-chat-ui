import { json, type RequestEvent } from '@sveltejs/kit';
import { getConversationMessages } from '../../../../services/conversation.service';

export const GET = async (event: RequestEvent) => {
	try {
		const conversationId = event.params.conversationId;
		const userId = event.url.searchParams.get('userId');
		
		if (!conversationId || !userId) {
			return json({ error: 'conversationId and userId are required' }, { status: 400 });
		}

		const messages = await getConversationMessages(conversationId, userId);
		return json({ messages });
	} catch (error) {
		console.error('Error in conversation messages API server endpoint:', error);
		return json({ error: 'Failed to fetch messages' }, { status: 500 });
	}
};

