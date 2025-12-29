import { post_ } from './common';
import type { ChatRequest } from '$lib/types/chat';
import { BACKEND_API_URL } from '$env/static/private';
import { RequestResponseCacheService } from '$lib/server/cache/request.response.cache.service';
import { Helper } from '$lib/utils/helper';

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

		const response = await post_(url, body);

		// Clear related cache entries after sending message
		// const keysToBeDeleted = [
		// 	`req-${Helper.uuidToBase64(userId)}:getConversationMessages-${Helper.uuidToBase64(conversationId)}`,
		// 	`req-${Helper.uuidToBase64(userId)}:getConversationMessagesById-${Helper.uuidToBase64(conversationId)}`
		// ];
		// await RequestResponseCacheService.findAndClear(keysToBeDeleted);

		// Return the raw backend response so the frontend can render
		// rich content (tables, lists, interactive blocks, etc.)
		return response;
	} catch (error) {
		console.error('Error in sendMessageToMastra:', error);
		throw error;
	}
};
