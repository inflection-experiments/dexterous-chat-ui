import { post_ } from './common';
import type { Message, ChatRequest } from '$lib/types/chat';
import { BACKEND_API_URL } from '$env/static/private';
import { ResponseHandler } from '$lib/utils/response.handler';
import { RequestResponseCacheService } from '$lib/server/cache/request.response.cache.service';
import { Helper } from '$lib/utils/helper';

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

		// Clear related cache entries after sending message
		// const keysToBeDeleted = [
		// 	`req-${Helper.uuidToBase64(userId)}:getConversationMessages-${Helper.uuidToBase64(conversationId)}`,
		// 	`req-${Helper.uuidToBase64(userId)}:getConversationMessagesById-${Helper.uuidToBase64(conversationId)}`
		// ];
		// await RequestResponseCacheService.findAndClear(keysToBeDeleted);

		return ResponseHandler.processBackendResponseToMessage(response);
	} catch (error) {
		console.error('Error in sendMessageToMastra:', error);
		throw error;
	}
};
