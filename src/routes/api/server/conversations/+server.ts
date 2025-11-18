import { json, type RequestEvent } from '@sveltejs/kit';
import { getConversationsByUserId } from '../../services/conversation.service';

export const GET = async (event: RequestEvent) => {
	try {
		const userId = event.url.searchParams.get('userId');
		
		if (!userId) {
			return json({ error: 'userId is required' }, { status: 400 });
		}

		const conversations = await getConversationsByUserId(userId);
		return json({ conversations });
	} catch (error) {
		console.error('Error in conversations API server endpoint:', error);
		return json({ error: 'Failed to fetch conversations' }, { status: 500 });
	}
};

