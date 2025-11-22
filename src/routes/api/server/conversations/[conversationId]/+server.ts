import { json, type RequestEvent } from '@sveltejs/kit';
// import { deleteConversation } from '../../../../services/conversation.service.ts';
import { ResponseHandler } from '$lib/utils/response.handler';
import { deleteConversation } from '../../../services/conversation.service';

export const DELETE = async (event: RequestEvent) => {
	try {
		const conversationId = event.params.conversationId;

		if (!conversationId) {
			return json({ error: 'conversationId is required' }, { status: 400 });
		}

		const backendResponse = await deleteConversation(conversationId);
		
		// Check if deletion was successful
		if (backendResponse && (backendResponse.Status === 'success' || backendResponse.status === 'success')) {
			return json({ 
				status: 'success', 
				message: backendResponse.Message || backendResponse.message || 'Conversation deleted successfully' 
			}, { status: 200 });
		} else {
			return json({ 
				status: 'error', 
				message: backendResponse.Message || backendResponse.message || 'Failed to delete conversation' 
			}, { status: backendResponse.HttpCode || backendResponse.httpCode || 500 });
		}
	} catch (error) {
		console.error('Error in delete conversation API server endpoint:', error);
		return ResponseHandler.handleError(500, null, error);
	}
};

