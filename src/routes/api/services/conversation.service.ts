import { get_, post_, post__, delete_ } from './common';
import { BACKEND_API_URL } from '$env/static/private';
import type { Conversation } from '$lib/types/botTypes';
import { RequestResponseCacheService } from '$lib/server/cache/request.response.cache.service';
import { Helper } from '$lib/utils/helper';

export const getConversationsByUserId = async (userId: string): Promise<Conversation[]> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations/search?userId=${userId}`;
		var cacheKey = `req-${Helper.uuidToBase64(userId)}:getConversationsByUserId`;
		if (await RequestResponseCacheService.has(cacheKey)) {
			return await RequestResponseCacheService.get(cacheKey);
		}
		
		const response = await get_(url);
		
		// Handle different response structures - check for Data.Items first (new paginated structure)
		let result: Conversation[] = [];
		if (response.Data && response.Data.Items && Array.isArray(response.Data.Items)) {
			result = response.Data.Items;
		} else if (response.Data && Array.isArray(response.Data)) {
			result = response.Data;
		} else if (Array.isArray(response)) {
			result = response;
		} else if (response.data && response.data.Items && Array.isArray(response.data.Items)) {
			result = response.data.Items;
		} else if (response.data && Array.isArray(response.data)) {
			result = response.data;
		} else if (response.conversations && Array.isArray(response.conversations)) {
			result = response.conversations;
		}
		
		await RequestResponseCacheService.set(cacheKey, result);
		return result;
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
		var cacheKey = `req-${Helper.uuidToBase64(userId)}:getConversationMessages-${Helper.uuidToBase64(conversationId)}`;
		if (await RequestResponseCacheService.has(cacheKey)) {
			return await RequestResponseCacheService.get(cacheKey);
		}
		
		const response = await get_(url);
		
		// Handle different response structures
		let result: any[] = [];
		if (Array.isArray(response)) {
			result = response;
		} else if (response.data && Array.isArray(response.data)) {
			result = response.data;
		} else if (response.messages && Array.isArray(response.messages)) {
			result = response.messages;
		}
		
		await RequestResponseCacheService.set(cacheKey, result);
		return result;
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
		var cacheKey = `req-${Helper.uuidToBase64(conversationId)}:getConversationMessagesById`;
		if (await RequestResponseCacheService.has(cacheKey)) {
			return await RequestResponseCacheService.get(cacheKey);
		}
		
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
		
		await RequestResponseCacheService.set(cacheKey, messages);
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
		
		// Clear related cache entries after creating conversation
		const keysToBeDeleted = [
			`req-${Helper.uuidToBase64(userId)}:getConversationsByUserId`
		];
		await RequestResponseCacheService.findAndClear(keysToBeDeleted);
		
		return response;
	} catch (error) {
		console.error('Error in createConversation:', error);
		throw error;
	}
};

export const deleteConversation = async (conversationId: string): Promise<any> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations/${conversationId}`;
		const response = await delete_(url);
		
		// Clear related cache entries after deleting conversation
		const keysToBeDeleted = [
			`req-${Helper.uuidToBase64(conversationId)}:getConversationMessagesById`,
			`req-${Helper.uuidToBase64(conversationId)}:getConversationMessages`
		];
		await RequestResponseCacheService.findAndClear(keysToBeDeleted);
		
		return response;
	} catch (error) {
		console.error('Error in deleteConversation:', error);
		throw error;
	}
};

