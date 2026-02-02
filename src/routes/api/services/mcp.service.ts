import { post_, get_ } from './common';
import { BACKEND_API_URL } from '$env/static/private';

/**
 * Call the MCP Definition endpoint with a flat request body.
 * Body should include: { tool, userId, ...toolSpecificFields }
 */
export const callMcpDefinition = async (body: Record<string, any>): Promise<any> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/mcp/definition`;
		console.log('MCP Definition request:', JSON.stringify(body, null, 2));
		const response = await post_(url, body);
		return response;
	} catch (error) {
		console.error('Error in callMcpDefinition:', error);
		throw error;
	}
};

/**
 * Check MCP service health
 */
export const getMcpHealth = async (): Promise<any> => {
	try {
		const url = `${BACKEND_API_URL}/dexterous/mcp/health`;
		const response = await get_(url);
		return response;
	} catch (error) {
		console.error('Error in getMcpHealth:', error);
		throw error;
	}
};
