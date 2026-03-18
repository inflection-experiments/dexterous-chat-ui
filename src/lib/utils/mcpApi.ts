import type { McpToolName, McpApiResponse, McpHealthResponse } from '$lib/types/mcp.types';

/**
 * Generic fetch wrapper for MCP API calls.
 * Always returns parsed JSON — does not throw on HTTP errors,
 * so the testing UI can display both success and error responses.
 */
const mcpFetch = async <T = any>(url: string, options: RequestInit = {}): Promise<T> => {
	const response = await fetch(url, {
		headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string>) },
		...options
	});
	const data = await response.json();
	return data as T;
};

/**
 * Execute an MCP tool by name with parameters.
 * Sends a flat body: { tool, userId, ...toolSpecificFields }
 * POST /api/mcp/definition
 */
export const executeMcpTool = async (
	tool: McpToolName,
	params: Record<string, any>
): Promise<McpApiResponse> => {
	return mcpFetch<McpApiResponse>('/api/mcp/definition', {
		method: 'POST',
		body: JSON.stringify({ tool, ...params })
	});
};

/**
 * Check MCP service health.
 * GET /api/mcp/health
 */
export const checkMcpHealth = async (): Promise<McpApiResponse<McpHealthResponse>> => {
	return mcpFetch<McpApiResponse<McpHealthResponse>>('/api/mcp/health');
};
