import { json, type RequestEvent } from '@sveltejs/kit';
import { callMcpDefinition } from '../../services/mcp.service';

export const POST = async (event: RequestEvent) => {
	try {
		const data = await event.request.json();

		if (!data.tool) {
			return json({ Status: 'failure', Message: 'tool is required', HttpCode: 400, Data: null }, { status: 400 });
		}
		if (!data.userId) {
			return json({ Status: 'failure', Message: 'userId is required', HttpCode: 400, Data: null }, { status: 400 });
		}

		const backendResponse = await callMcpDefinition(data);

		return json(backendResponse, {
			status: backendResponse?.HttpCode || 200
		});
	} catch (error) {
		console.error('Error in MCP definition API endpoint:', error);
		return json(
			{
				Status: 'failure',
				Message: error instanceof Error ? error.message : 'Internal Server Error',
				HttpCode: 500,
				Data: null
			},
			{ status: 500 }
		);
	}
};
