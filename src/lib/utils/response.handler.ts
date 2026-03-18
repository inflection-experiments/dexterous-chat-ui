import type { Message } from '$lib/types/chat';
import { json } from '@sveltejs/kit';
import { transformBackendResponseToStructured } from './responseTransformer';

export class ResponseHandler {
    static success(response: any): Response {
        return new Response(JSON.stringify(response), {
            status: response.HttpCode || 200, 
            headers: { 'Content-Type': 'application/json' },
        });
    }

    /**
     * Parses the backend response and extracts the content text from the Contents array
     * Handles various response structures and formats including new format with AssistantContent
     */
    static parseBackendResponse(response: any): string | null {
        if (!response) {
            return null;
        }

        // Handle new format: Data array with AssistantContent
        if (response?.Data && Array.isArray(response.Data) && response.Data.length > 0) {
            const latestMessage = response.Data[response.Data.length - 1];
            if (latestMessage.AssistantContent && Array.isArray(latestMessage.AssistantContent)) {
                const contentParts: string[] = [];
                for (const content of latestMessage.AssistantContent) {
                    if (content.type === 'text' && content.data?.text) {
                        contentParts.push(content.data.text.trim());
                    }
                }
                if (contentParts.length > 0) {
                    return contentParts.join('\n\n');
                }
            }
        }

        // Handle single message with AssistantContent
        if (response?.Data?.AssistantContent && Array.isArray(response.Data.AssistantContent)) {
            const contentParts: string[] = [];
            for (const content of response.Data.AssistantContent) {
                if (content.type === 'text' && content.data?.text) {
                    contentParts.push(content.data.text.trim());
                }
            }
            if (contentParts.length > 0) {
                return contentParts.join('\n\n');
            }
        }

        // Prefer nested content returned under Data.Contents[0].data.text (old format)
        const nestedContents = response?.Data?.Contents;
        if (Array.isArray(nestedContents) && nestedContents.length > 0) {
            // Combine all content items into a formatted string
            const contentParts: string[] = [];
            
            for (const content of nestedContents) {
                let contentText: string | null = null;
                
                // Try different possible structures
                if (content?.data?.text) {
                    contentText = content.data.text;
                } else if (content?.data?.message) {
                    contentText = content.data.message;
                } else if (content?.text) {
                    contentText = content.text;
                } else if (content?.content) {
                    contentText = content.content;
                } else if (typeof content === 'string') {
                    contentText = content;
                } else if (content?.data && typeof content.data === 'string') {
                    contentText = content.data;
                }

                if (contentText && typeof contentText === 'string' && contentText.trim().length > 0) {
                    contentParts.push(contentText.trim());
                }
            }

            if (contentParts.length > 0) {
                return contentParts.join('\n\n');
            }
        }

        // Other generic fallbacks
        if (response && response.content) {
            return response.content;
        }
        if (response && response.message) {
            return response.message;
        }
        if (response && response.Message) {
            return response.Message;
        }

        return null;
    }

    /**
     * Processes the backend response and converts it to a Message object
     * Used by service layer to transform backend responses
     * Now supports structured responses with BotResponse format
     */
    static processBackendResponseToMessage(backendResponse: any): Message | null {
        if (!backendResponse) {
            return null;
        }

        // Check if this is a new structured response format (has BotResponse)
        const botResponseArray = this.findBotResponseArray(backendResponse);
        const hasStructuredResponse = botResponseArray && botResponseArray.length > 0;

        if (hasStructuredResponse) {
            // Transform to structured format
            const structuredResponse = transformBackendResponseToStructured(backendResponse);

            // Extract plain text content for the Content field (for fallback display)
            const contentText = this.extractTextFromBotResponse(botResponseArray);

            return {
                id: Date.now(),
                Content: contentText || 'Response received',
                Role: 'Assistant',
                StructuredResponse: structuredResponse
            };
        }

        // Fall back to old parsing logic
        const contentText = this.parseBackendResponse(backendResponse);

        if (contentText) {
            return {
                id: Date.now(),
                Content: contentText,
                Role: 'Assistant'
            };
        }

        return null;
    }

    /**
     * Find BotResponse array in various possible locations
     */
    private static findBotResponseArray(backendResponse: any): any[] | null {
        // Direct path: Data.BotResponse
        if (backendResponse?.Data?.BotResponse && Array.isArray(backendResponse.Data.BotResponse)) {
            return backendResponse.Data.BotResponse;
        }

        // Nested in AssistantContent array
        if (Array.isArray(backendResponse?.AssistantContent)) {
            for (const item of backendResponse.AssistantContent) {
                if (item?.Data?.BotResponse && Array.isArray(item.Data.BotResponse)) {
                    return item.Data.BotResponse;
                }
            }
        }

        // Nested in UserContent array
        if (Array.isArray(backendResponse?.UserContent)) {
            for (const item of backendResponse.UserContent) {
                if (item?.Data?.BotResponse && Array.isArray(item.Data.BotResponse)) {
                    return item.Data.BotResponse;
                }
            }
        }

        return null;
    }

    /**
     * Extract plain text from BotResponse array for fallback display
     */
    private static extractTextFromBotResponse(botResponses: any[]): string {
        const textParts: string[] = [];

        for (const item of botResponses) {
            const content = item?.Content;
            if (!content) continue;

            // If content is a string, use it directly
            if (typeof content === 'string') {
                textParts.push(content);
            }
            // If content is an object with text-like properties
            else if (typeof content === 'object') {
                if ('text' in content) {
                    textParts.push(String(content.text));
                } else if ('Label' in content) {
                    textParts.push(String(content.Label));
                }
            }
        }

        return textParts.join('\n\n');
    }

    /**
     * Formats the server response for the frontend
     * Handles both success and error cases
     */
    static formatServerResponse(backendResponse: Message | null): Response {
        if (backendResponse) {
            return json(
                {
                    status: 'success',
                    message: backendResponse.Content
                },
                { status: 200 }
            );
        } else {
            return json(
                {
                    status: 'error',
                    message: 'Failed to get response from AI'
                },
                { status: 500 }
            );
        }
    }

    static handleError = (httpCode: number = 500,
        data?: any,
        error?: any): Response =>{
        console.error('Error:', error);

        return new Response(
            JSON.stringify({
                Status: 'failure',
                HttpCode: httpCode,
                Message: error instanceof Error ? error?.message : 'An error occurred while processing the request.',
                Data:data
            }),
            {
                status: httpCode,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
