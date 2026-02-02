import type {
	McpToolName,
	McpToolConfig,
	McpFormValues,
	McpValidationError
} from '$lib/types/mcp.types';

// ==========================================
// TOOL CONFIGURATIONS
// ==========================================

export const MCP_TOOL_CONFIGS: McpToolConfig[] = [
	{
		name: 'define_entities',
		displayName: 'Define Entities',
		description: 'Define entities from a message within a conversation context.',
		fields: [
			{
				name: 'message',
				label: 'Message',
				type: 'textarea',
				required: true,
				placeholder: 'Enter the message to analyze for entities...'
			},
			{
				name: 'conversationId',
				label: 'Conversation ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000'
			},
			{
				name: 'projectId',
				label: 'Project ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. df4c6df0-594a-4dcb-8754-49eead9743f3'
			},
			{
				name: 'userId',
				label: 'User ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 74f22a5f-8ed2-45ce-af2e-ac4c32d824f4'
			},
			{
				name: 'channel',
				label: 'Channel',
				type: 'text',
				required: false,
				placeholder: 'web',
				defaultValue: 'web'
			},
			{
				name: 'metadata',
				label: 'Metadata (JSON)',
				type: 'json',
				required: false,
				placeholder: '{"key": "value"}'
			}
		]
	},
	{
		name: 'get_conversation_history',
		displayName: 'Get Conversation History',
		description: 'Retrieve conversation message history with pagination.',
		fields: [
			{
				name: 'conversationId',
				label: 'Conversation ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000'
			},
			{
				name: 'userId',
				label: 'User ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 74f22a5f-8ed2-45ce-af2e-ac4c32d824f4'
			},
			{
				name: 'limit',
				label: 'Limit',
				type: 'number',
				required: false,
				placeholder: '50',
				min: 1,
				max: 100,
				defaultValue: 50,
				description: 'Number of messages to return (1-100)'
			},
			{
				name: 'offset',
				label: 'Offset',
				type: 'number',
				required: false,
				placeholder: '0',
				min: 0,
				defaultValue: 0
			}
		]
	},
	{
		name: 'search_conversations',
		displayName: 'Search Conversations',
		description: 'Search conversations by user with optional filters.',
		fields: [
			{
				name: 'userId',
				label: 'User ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 74f22a5f-8ed2-45ce-af2e-ac4c32d824f4'
			},
			{
				name: 'projectId',
				label: 'Project ID',
				type: 'text',
				required: false,
				placeholder: 'Optional project filter'
			},
			{
				name: 'query',
				label: 'Search Query',
				type: 'text',
				required: false,
				placeholder: 'Optional search text...'
			},
			{
				name: 'limit',
				label: 'Limit',
				type: 'number',
				required: false,
				placeholder: '20',
				min: 1,
				defaultValue: 20
			},
			{
				name: 'offset',
				label: 'Offset',
				type: 'number',
				required: false,
				placeholder: '0',
				min: 0,
				defaultValue: 0
			}
		]
	},
	{
		name: 'get_project_context',
		displayName: 'Get Project Context',
		description: 'Retrieve project context and optional cache data.',
		fields: [
			{
				name: 'projectId',
				label: 'Project ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. df4c6df0-594a-4dcb-8754-49eead9743f3'
			},
			{
				name: 'userId',
				label: 'User ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 74f22a5f-8ed2-45ce-af2e-ac4c32d824f4'
			},
			{
				name: 'conversationId',
				label: 'Conversation ID',
				type: 'text',
				required: false,
				placeholder: 'Optional conversation context'
			},
			{
				name: 'includeCache',
				label: 'Include Cache',
				type: 'boolean',
				required: false,
				defaultValue: false,
				description: 'Include cached entity data in the response'
			}
		]
	},
	{
		name: 'get_cache_summary',
		displayName: 'Get Cache Summary',
		description: 'Get a summary of cached entities for a conversation and project.',
		fields: [
			{
				name: 'conversationId',
				label: 'Conversation ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 550e8400-e29b-41d4-a716-446655440000'
			},
			{
				name: 'projectId',
				label: 'Project ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. df4c6df0-594a-4dcb-8754-49eead9743f3'
			},
			{
				name: 'userId',
				label: 'User ID',
				type: 'text',
				required: true,
				placeholder: 'e.g. 74f22a5f-8ed2-45ce-af2e-ac4c32d824f4'
			}
		]
	}
];

// ==========================================
// HELPERS
// ==========================================

/**
 * Get config for a specific tool.
 */
export const getToolConfig = (toolName: McpToolName): McpToolConfig => {
	const config = MCP_TOOL_CONFIGS.find((t) => t.name === toolName);
	if (!config) throw new Error(`Unknown MCP tool: ${toolName}`);
	return config;
};

/**
 * Generate default form values for a tool.
 */
export const getDefaultValues = (toolName: McpToolName, userId?: string): McpFormValues => {
	const config = getToolConfig(toolName);
	const values: McpFormValues = {};
	for (const field of config.fields) {
		if (field.name === 'userId' && userId) {
			values[field.name] = userId;
		} else if (field.defaultValue !== undefined) {
			values[field.name] = field.defaultValue;
		} else if (field.type === 'boolean') {
			values[field.name] = false;
		} else if (field.type === 'number') {
			values[field.name] = undefined;
		} else {
			values[field.name] = '';
		}
	}
	return values;
};

/**
 * Validate form values against tool config.
 * Returns array of errors (empty = valid).
 */
export const validateFormValues = (
	toolName: McpToolName,
	values: McpFormValues
): McpValidationError[] => {
	const config = getToolConfig(toolName);
	const errors: McpValidationError[] = [];

	for (const field of config.fields) {
		const value = values[field.name];

		// Required check
		if (field.required) {
			if (value === undefined || value === null || value === '') {
				errors.push({ field: field.name, message: `${field.label} is required` });
				continue;
			}
		}

		// Skip further validation if empty and optional
		if (value === undefined || value === null || value === '') continue;

		// Number range check
		if (field.type === 'number') {
			const num = typeof value === 'string' ? parseFloat(value) : value;
			if (typeof num === 'number' && !isNaN(num)) {
				if (field.min !== undefined && num < field.min) {
					errors.push({
						field: field.name,
						message: `${field.label} must be at least ${field.min}`
					});
				}
				if (field.max !== undefined && num > field.max) {
					errors.push({
						field: field.name,
						message: `${field.label} must be at most ${field.max}`
					});
				}
			}
		}

		// JSON validation
		if (field.type === 'json' && typeof value === 'string' && value.trim()) {
			try {
				JSON.parse(value);
			} catch {
				errors.push({ field: field.name, message: `${field.label} must be valid JSON` });
			}
		}
	}

	return errors;
};

/**
 * Build the request params object from form values.
 * Cleans out empty optional fields, parses JSON, coerces types.
 */
export const buildRequestParams = (
	toolName: McpToolName,
	values: McpFormValues
): Record<string, any> => {
	const config = getToolConfig(toolName);
	const params: Record<string, any> = {};

	for (const field of config.fields) {
		const value = values[field.name];

		// Skip empty optional fields
		if (!field.required && (value === undefined || value === null || value === '')) {
			continue;
		}

		if (field.type === 'number') {
			const num = typeof value === 'string' ? parseInt(value, 10) : value;
			if (typeof num === 'number' && !isNaN(num)) {
				params[field.name] = num;
			}
		} else if (field.type === 'json' && typeof value === 'string' && value.trim()) {
			try {
				params[field.name] = JSON.parse(value);
			} catch {
				params[field.name] = value;
			}
		} else if (field.type === 'boolean') {
			params[field.name] = Boolean(value);
		} else {
			params[field.name] = value;
		}
	}

	return params;
};
