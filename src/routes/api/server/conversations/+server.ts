import { json, type RequestEvent } from '@sveltejs/kit';
import { getConversationsByUserId, createConversation } from '../../services/conversation.service';
import { ResponseHandler } from '$lib/utils/response.handler';

export const GET = async (event: RequestEvent) => {
	try {
		const userId = event.url.searchParams.get('userId');

		if (!userId) {
			return json({ error: 'userId is required' }, { status: 400 });
		}

		const conversations = await getConversationsByUserId(userId);
		return json({ conversations });
	} catch (error) {
		console.error('Error in get conversations API server endpoint:', error);
		return ResponseHandler.handleError(500, null, error);
	}
};

export const POST = async (event: RequestEvent) => {
	try {
		const request = event.request;
		const data = await request.json();

		if (!data.ProjectId) {
			return json({ error: 'ProjectId is required' }, { status: 400 });
		}

		if (!data.userId) {
			return json({ error: 'userId is required' }, { status: 400 });
		}

		const backendResponse = await createConversation(data.ProjectId, data.userId);
		return ResponseHandler.success(backendResponse);
	} catch (error) {
		console.error('Error in create conversation API server endpoint:', error);
		return ResponseHandler.handleError(500, null, error);
	}
};
