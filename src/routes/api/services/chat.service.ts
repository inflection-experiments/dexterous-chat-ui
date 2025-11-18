import { post_ } from './common';
import type { Message, ChatRequest } from '$lib/types/chat';
import { BACKEND_API_URL } from '$env/static/private';
import { ResponseHandler } from '$lib/utils/response.handler';

export const sendMessageToMastra = async (
	conversationId: string,
	message: string,
	userId: string,
	referenceMessageId: string
): Promise<Message | null> => {
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

		const response = await post_(url, body);

		return ResponseHandler.processBackendResponseToMessage(response);
	} catch (error) {
		console.error('Error in sendMessageToMastra:', error);
		throw error;
	}
};
