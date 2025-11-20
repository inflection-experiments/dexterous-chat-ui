import { get_ } from './common';
import { BACKEND_API_URL } from '$env/static/private';
import type { Conversation } from '$lib/types/botTypes';

export const getConversationsByUserId = async (userId: string): Promise<Conversation[]> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/chat/conversations?userId=${userId}`;
		const response = await get_(url);
		
		// Handle different response structures - check for Data (capital D) field first
		if (response.Data && Array.isArray(response.Data)) {
			return response.Data;
		} else if (Array.isArray(response)) {
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
		
		// Transform messages to extract Content from object and format properly
		return messages.map((msg: any) => {
			// Extract content from Content - handle array structure
			let contentText = '';
			if (Array.isArray(msg.Content)) {
				// Content is an array of objects: [{ data: { text: '...' }, type: 'text' }]
				contentText = msg.Content.map((item: any) => {
					if (item.data && item.data.text) {
						return item.data.text;
					} else if (item.text) {
						return item.text;
					}
					return '';
				}).filter((text: string) => text !== '').join('\n');
			} else if (typeof msg.Content === 'object' && msg.Content !== null) {
				// Handle Content object structure - could be { type: 'text', data: { text: '...' } }
				if (msg.Content.data && msg.Content.data.text) {
					contentText = msg.Content.data.text;
				} else if (msg.Content.text) {
					contentText = msg.Content.text;
				} else if (Array.isArray(msg.Content.Contents)) {
					// Handle Contents array
					contentText = msg.Content.Contents.map((c: any) => {
						if (c.data && c.data.text) return c.data.text;
						if (c.text) return c.text;
						return '';
					}).join('\n');
				} else {
					// Fallback: try to stringify or get first property
					contentText = JSON.stringify(msg.Content);
				}
			} else if (typeof msg.Content === 'string') {
				contentText = msg.Content;
			}
			
			// Transform to expected format
			return {
				id: msg.id,
				Content: contentText,
				Role: msg.Role === 'user' ? 'User' : msg.Role === 'assistant' ? 'Assistant' : msg.Role || 'User',
				ConversationId: msg.ConversationId,
				Metadata: msg.Metadata,
				CreatedAt: msg.CreatedAt
			};
		});
	} catch (error) {
		console.error('Error in getConversationMessagesById:', error);
		throw error;
	}
};

