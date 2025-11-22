import type { PageServerLoad } from './$types.ts';
import { getConversationsByUserId } from '../../../api/services/conversation.service';

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.userId;
	
	try {
		// Get all conversations for the user
		const conversations = await getConversationsByUserId(userId);
		
		console.log('Loaded conversations:', conversations);
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

