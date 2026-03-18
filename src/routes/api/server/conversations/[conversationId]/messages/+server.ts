import { json, type RequestEvent } from '@sveltejs/kit';
import { getConversationMessagesById } from '../../../../services/conversation.service';

export const GET = async (event: RequestEvent) => {
	try {
		const conversationId = event.params.conversationId;
		const userId = event.url.searchParams.get('userId') || event.request.headers.get('x-user-id') || '';

		if (!conversationId) {
			return json({ error: 'conversationId is required' }, { status: 400 });
		}

		const messages = await getConversationMessagesById(conversationId, userId);
		console.log('Messages fetched for conversation:', conversationId, 'Count:', messages.length);
		console.log('Messages structure:', JSON.stringify(messages.slice(0, 1), null, 2));
		// Return messages in Data field to match backend response format
		return json({ Data: messages });
	} catch (error) {
		console.error('Error in conversation messages API server endpoint:', error);
		return json({ error: 'Failed to fetch messages' }, { status: 500 });
	}
};
