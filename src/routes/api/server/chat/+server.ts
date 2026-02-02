import { json, type RequestEvent } from '@sveltejs/kit';
import { sendMessageToMastra } from '../../services/chat.service';

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

		if (!backendResponse) {
			return json(
				{ status: 'error', message: 'Failed to get response from AI' },
				{ status: 500 }
			);
		}

		// Return the full backend response (including Data.BotResponse)
		// so the client can use progressive rendering and structured content
		return json(backendResponse);
	} catch (error) {
		console.error('Error in chat API server endpoint:', error);
		return json(
			{ status: 'error', message: error instanceof Error ? error.message : 'Internal Server Error' },
			{ status: 500 }
		);
	}
};
