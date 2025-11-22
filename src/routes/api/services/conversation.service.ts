import { get_, post_, post__ } from './common';
import { BACKEND_API_URL } from '$env/static/private';
import type { Conversation } from '$lib/types/botTypes';

export const getConversationsByUserId = async (userId: string): Promise<Conversation[]> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations/search?userId=${userId}`;
		const response = await get_(url);
		
		// Handle different response structures - check for Data.Items first (new paginated structure)
		if (response.Data && response.Data.Items && Array.isArray(response.Data.Items)) {
			return response.Data.Items;
		} else if (response.Data && Array.isArray(response.Data)) {
			return response.Data;
		} else if (Array.isArray(response)) {
			return response;
		} else if (response.data && response.data.Items && Array.isArray(response.data.Items)) {
			return response.data.Items;
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
export const getConversationMessagesById = async (
	conversationId: string
): Promise<any[]> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations/${conversationId}/messages`;
		const response = await get_(url);
		
		// Extract messages from response - handle Data (capital D) field
		let messages: any[] = [];
		if (response.Data && Array.isArray(response.Data)) {
			messages = response.Data;
		} else if (Array.isArray(response)) {
			messages = response;
		} else if (response.data && Array.isArray(response.data)) {
			messages = response.data;
		} else if (response.messages && Array.isArray(response.messages)) {
			messages = response.messages;
		}
		
		// Return messages as-is (they have UserContent and AssistantContent arrays)
		// The frontend will handle the conversion
		return messages;
	} catch (error) {
		console.error('Error in getConversationMessagesById:', error);
		throw error;
	}
};

export const createConversation = async (projectId: string, userId: string): Promise<any> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations`;
		const body = {
			ProjectId: projectId
		};
		const response = await post__(url, body, userId);
		return response;
	} catch (error) {
		console.error('Error in createConversation:', error);
		throw error;
	}
};

