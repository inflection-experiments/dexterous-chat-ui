import { json, type RequestEvent } from '@sveltejs/kit';
import { BACKEND_API_URL } from '$env/static/private';
import { post__ } from '../../services/common';

export const POST = async (event: RequestEvent) => {
	try {
		const request = event.request;
		const data = await request.json();

		if (!data.conversationId || !data.projectId || !data.entityType || !data.selectedItems || !data.action) {
			return json(
				{ error: 'conversationId, projectId, entityType, selectedItems, and action are required' },
				{ status: 400 }
			);
		}

		// Always use /selections/confirm endpoint - the controller handles both confirm and reject via the action field
		const url = `${BACKEND_API_URL}/dexterous/chat/selections/confirm`;
		const userId = data.userId || '';

		// Forward authorization header if present (for Deft Source API auth)
		const authHeader = request.headers.get('authorization') || '';

		const backendResponse = await post__(url, data, userId, authHeader);

		return json(backendResponse);
	} catch (error) {
		console.error('Error in selections API server endpoint:', error);
		return json(
			{ status: 'error', message: error instanceof Error ? error.message : 'Internal Server Error' },
			{ status: 500 }
		);
	}
};
