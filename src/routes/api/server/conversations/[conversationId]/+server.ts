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
			// Return error response with appropriate status code
			const statusCode = backendResponse?.HttpCode || backendResponse?.httpCode || 500;
			return json({ 
				status: 'error', 
				message: backendResponse?.Message || backendResponse?.message || 'Failed to delete conversation' 
			}, { status: statusCode });
		}
	} catch (error: any) {
		console.error('Error in delete conversation API server endpoint:', error);
		
		// If it's already an HttpError from SvelteKit, return it
		if (error?.status) {
			return ResponseHandler.handleError(error.status, null, error);
		}
		
		// Otherwise, return a 500 error
		return ResponseHandler.handleError(500, null, error);
	}
};

