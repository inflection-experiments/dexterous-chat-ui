export interface Message {
  id: number | string;
  Content: string;
  Role: 'User' | 'Assistant';
}

export interface StructuredResponse {
  Message: string;
  Data?: any[];
  ResponseFormat?: 'json' | 'sql' | 'image' | 'table' | 'text';
  Metadata?: {
    inputType?: string;
    hasInputData?: boolean;
    confidence?: number;
  };
  SuggestedActions?: string[];
}

export interface BackendResponse {
  Status: string;
  Message: string;
  HttpCode: number;
  Data: StructuredResponse;
  ClientIps: string[];
  APIVersion: string;
}

export interface EnhancedMessage extends Message {
  structuredData?: StructuredResponse;
  downloadUrl?: string;
  actions?: string[];
}
