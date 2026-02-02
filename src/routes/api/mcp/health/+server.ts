import { json, type RequestEvent } from '@sveltejs/kit';
import { getMcpHealth } from '../../services/mcp.service';

export const GET = async (event: RequestEvent) => {
	try {
		const backendResponse = await getMcpHealth();
		return json(backendResponse, {
			status: backendResponse?.HttpCode || 200
		});
	} catch (error) {
		console.error('Error in MCP health API endpoint:', error);
		return json(
			{
				Status: 'failure',
				Message: 'MCP health check failed',
				HttpCode: 500,
				Data: null
			},
			{ status: 500 }
		);
	}
};
