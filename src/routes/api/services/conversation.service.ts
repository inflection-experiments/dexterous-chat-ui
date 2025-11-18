import { get_ } from './common';
import { BACKEND_API_URL } from '$env/static/private';
import type { Conversation } from '$lib/types/botTypes';

export const getConversationsByUserId = async (userId: string): Promise<Conversation[]> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations?userId=${userId}`;
		const response = await get_(url);
		
		// Handle different response structures
		if (Array.isArray(response)) {
			return response;
		} else if (response.data && Array.isArray(response.data)) {
			return response.data;
		} else if (response.conversations && Array.isArray(response.conversations)) {
			return response.conversations;
		}
		
		return [];
	} catch (error) {
		console.error('Error in getConversationsByUserId:', error);
		throw error;
	}
};

export const getConversationMessages = async (
	conversationId: string,
	userId: string
): Promise<any[]> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations/${conversationId}/messages?userId=${userId}`;
		const response = await get_(url);
		
		// Handle different response structures
		if (Array.isArray(response)) {
			return response;
		} else if (response.data && Array.isArray(response.data)) {
			return response.data;
		} else if (response.messages && Array.isArray(response.messages)) {
			return response.messages;
		}
		
		return [];
	} catch (error) {
		console.error('Error in getConversationMessages:', error);
		throw error;
	}
};

