import type { PageServerLoad } from './$types.js';
import { getConversationsByUserId } from '../../../../api/services/conversation.service.js';

export const load: PageServerLoad = async ({ params }) => {
	const userId = params.userId;

	try {
		const conversations = await getConversationsByUserId(userId);

		return {
			userId,
			conversations: conversations || []
		};
	} catch (error) {
		console.error('Error loading conversations for MCP test:', error);
		return {
			userId,
			conversations: []
		};
	}
};
