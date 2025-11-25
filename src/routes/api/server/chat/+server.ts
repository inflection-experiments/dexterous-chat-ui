import { json, type RequestEvent } from '@sveltejs/kit';
import { sendMessageToMastra } from '../../services/chat.service';
import { ResponseHandler } from '$lib/utils/response.handler';

export const POST = async (event: RequestEvent) => {
	try {
		const request = event.request;
		const data = await request.json();

		if (!data.conversationId || !data.message || !data.userId || !data.referenceMessageId) {
			return json(
				{ error: 'conversationId, message, userId and referenceMessageId are required' },
				{ status: 400 }
			);
		}

		const backendResponse = await sendMessageToMastra(
			data.conversationId,
			data.message,
			data.userId,
			data.referenceMessageId
		);

		return ResponseHandler.formatServerResponse(backendResponse);
	} catch (error) {
		console.error('Error in chat API server endpoint:', error);
		return ResponseHandler.handleError(500, null, error);
	}
};
