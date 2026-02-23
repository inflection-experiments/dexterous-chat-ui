import { post__ } from './common';
import type { ChatRequest } from '$lib/types/chat';
import { BACKEND_API_URL } from '$env/static/private';

export const sendMessageToMastra = async (
	conversationId: string,
	message: string,
	userId: string,
	referenceMessageId: string,
	action?: { type: string; payload?: any; selectedItems?: any[] }
): Promise<any> => {
	try {
		const contents: ChatRequest['Contents'] = [
			{
				type: 'text',
				data: {
					text: message
				}
			}
		];

		// If action metadata is provided (button click, dropdown/radio selection),
		// add it as an 'interactive' content item so the backend agent can understand the intent
		if (action) {
			contents.push({
				type: 'interactive',
				data: {
					interactiveType: 'singleChoice',
					title: action.payload?.Label || action.type,
					options: [
						{
							id: action.payload?.id || action.type,
							label: action.payload?.Label || action.type,
							value: action.payload || { action: action.type }
						}
					],
					...(action.selectedItems && action.selectedItems.length > 0 && {
						selectedItems: action.selectedItems
					})
				}
			} as any);
		}

		const body: ChatRequest = {
			ConversationId: conversationId,
			UserId: userId,
			ReferenceMessageId: referenceMessageId,
			Channel: 'web',
			Contents: contents
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
