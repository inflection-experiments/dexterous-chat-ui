// ==========================================
// MCP TOOL NAMES
// ==========================================

export type McpToolName =
	| 'define_entities'
	| 'get_conversation_history'
	| 'search_conversations'
	| 'get_project_context'
	| 'get_cache_summary';

// ==========================================
// REQUEST TYPES (per tool)
// ==========================================

export interface DefineEntitiesRequest {
	message: string;
	conversationId: string;
	projectId: string;
	userId: string;
	channel?: string;
	metadata?: Record<string, any>;
}

export interface GetConversationHistoryRequest {
	conversationId: string;
	userId: string;
	limit?: number; // 1-100
	offset?: number;
}

export interface SearchConversationsRequest {
	userId: string;
	projectId?: string;
	query?: string;
	limit?: number;
	offset?: number;
}

export interface GetProjectContextRequest {
	projectId: string;
	userId: string;
	conversationId?: string;
	includeCache?: boolean;
}

export interface GetCacheSummaryRequest {
	conversationId: string;
	projectId: string;
	userId: string;
}

export type McpToolRequest =
	| DefineEntitiesRequest
	| GetConversationHistoryRequest
	| SearchConversationsRequest
	| GetProjectContextRequest
	| GetCacheSummaryRequest;

// ==========================================
// RESPONSE TYPES
// ==========================================

export interface McpApiResponse<T = any> {
	Status: 'success' | 'error' | 'failure';
	Message: string;
	HttpCode: number;
	Data: T;
}

// define_entities content item
export interface DefinitionContentItem {
	type: string;
	content: any;
	renderType?: string;
	dataType?: string;
	format?: string;
	sequence?: number;
}

// define_entities entities shape
export interface DefinitionEntities {
	services?: any[];
	models?: any[];
	columns?: any[];
	relations?: any[];
	enums?: any[];
}

// define_entities Data shape
export interface DefineEntitiesOutput {
	conversationId: string;
	userId: string;
	messageId?: string;
	content: DefinitionContentItem[];
	entities: DefinitionEntities;
	metadata?: Record<string, any>;
}

// get_conversation_history Data shape
export interface ConversationHistoryMessage {
	id: string;
	role: string;
	content: any;
	timestamp?: string;
	metadata?: Record<string, any>;
}

export interface ConversationHistoryOutput {
	conversationId: string;
	messages: ConversationHistoryMessage[];
	totalCount: number;
	hasMore: boolean;
}

// search_conversations Data shape
export interface SearchConversationItem {
	id: string;
	title?: string;
	createdAt?: string;
	updatedAt?: string;
	[key: string]: any;
}

export type SearchConversationsOutput = SearchConversationItem[];

// get_project_context Data shape
export interface ProjectContextOutput {
	projectId: string;
	projectName?: string;
	description?: string;
	domain?: string;
	cache?: DefinitionEntities;
	metadata?: Record<string, any>;
}

// get_cache_summary Data shape
export interface CacheSummaryOutput {
	[key: string]: any;
}

// ==========================================
// HEALTH CHECK
// ==========================================

export interface McpHealthResponse {
	status: string;
	timestamp?: string;
	version?: string;
	[key: string]: any;
}

// ==========================================
// FORM FIELD CONFIGURATION
// ==========================================

export interface McpFieldConfig {
	name: string;
	label: string;
	type: 'text' | 'textarea' | 'number' | 'boolean' | 'json';
	required: boolean;
	placeholder?: string;
	defaultValue?: any;
	min?: number;
	max?: number;
	description?: string;
}

export interface McpToolConfig {
	name: McpToolName;
	displayName: string;
	description: string;
	fields: McpFieldConfig[];
}

// ==========================================
// UI STATE TYPES
// ==========================================

export interface McpFormValues {
	[fieldName: string]: string | number | boolean | undefined;
}

export interface McpValidationError {
	field: string;
	message: string;
}

export interface McpExecutionState {
	isLoading: boolean;
	result: McpApiResponse | null;
	error: string | null;
	executedAt: string | null;
	duration: number | null;
}
