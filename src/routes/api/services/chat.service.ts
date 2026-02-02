import { post__ } from './common';
import type { ChatRequest } from '$lib/types/chat';
import { BACKEND_API_URL } from '$env/static/private';

export const sendMessageToMastra = async (
	conversationId: string,
	message: string,
	userId: string,
	referenceMessageId: string
): Promise<any> => {
	try {
		const body: ChatRequest = {
			ConversationId: conversationId,
			UserId: userId,
			ReferenceMessageId: referenceMessageId,
			Channel: 'web',
			Contents: [
				{
					type: 'text',
					data: {
						text: message
					}
				}
			]
		};

		const url = `${BACKEND_API_URL}/dexterous/chat/messages`;

		const response = await post__(url, body, userId);

		// Return the raw backend response so the client can access
		// Data.BotResponse for progressive rendering and structured content
		return response;
	} catch (error) {
		console.error('Error in sendMessageToMastra:', error);
		throw error;
	}
};
