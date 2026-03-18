// Backend Type Definitions - Matching Backend Types Exactly

export type uuid = string;
export type MessageRole = 'User' | 'Assistant' | 'System';

// ==========================================
// CHAT MESSAGE TYPES
// ==========================================

export interface ChatMessageCreateModel {
    ConversationId: uuid;
    Role?: MessageRole;
    Content?: any;
    UserContent?: any;
    AssistantContent?: any;
    Metadata?: any;
    ProjectId?: uuid;
    UserId?: uuid;
    ServiceId?: uuid;
}

export interface ChatMessageResponseDto {
    id: uuid;
    ConversationId: uuid;
    Role?: MessageRole;
    Content?: Content[] | Content;
    UserContent?: Content[] | Content;
    AssistantContent?: Content[] | Content;
    Metadata?: any;
    CreatedAt: Date;
}

export interface ChatMessage {
    UserId: uuid;
    Channel: string;
    ReferenceMessageId: uuid;
    ConversationId: uuid;
    Contents: Content[];
    Metadata?: any;
    Status: string;
    Message: string;
    Data: any;
}

// ==========================================
// CONTENT TYPE DEFINITIONS
// ==========================================

export type Content = 
    | TextContent 
    | TableContent 
    | ChartContent 
    | CodeContent 
    | ListContent 
    | FormContent
    | ImageContent
    | FileContent
    | InteractiveContent;

export interface TextContent {
    type: 'text';
    data: {
        text: string;
        format?: 'plain' | 'markdown' | 'html';
        style?: {
            bold?: boolean;
            italic?: boolean;
            color?: string;
            size?: 'small' | 'medium' | 'large';
        };
    };
}

export interface TableContent {
    type: 'table';
    data: {
        headers: string[];
        rows: (string | number | boolean)[][];
        sortable?: boolean;
        searchable?: boolean;
        pagination?: {
            page: number;
            pageSize: number;
            total: number;
        };
        style?: {
            striped?: boolean;
            bordered?: boolean;
            compact?: boolean;
        };
    };
}

export interface ChartContent {
    type: 'chart';
    data: {
        chartType: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'donut';
        title: string;
        datasets: Array<{
            label: string;
            data: number[];
            backgroundColor?: string[];
            borderColor?: string[];
        }>;
        labels: string[];
        options?: {
            responsive?: boolean;
            maintainAspectRatio?: boolean;
        };
    };
}

export interface CodeContent {
    type: 'code';
    data: {
        code: string;
        language: string;
        filename?: string;
        lineNumbers?: boolean;
        copyable?: boolean;
        style?: {
            theme?: 'light' | 'dark';
            fontSize?: number;
        };
    };
}

export interface ListContent {
    type: 'list';
    data: {
        items: Array<{
            content: string;
            subcontent?: string;
            icon?: string;
            link?: string;
        }>;
        listType: 'ordered' | 'unordered' | 'checklist';
        interactive?: boolean;
        style?: {
            compact?: boolean;
            bordered?: boolean;
        };
    };
}

export interface FormContent {
    type: 'form';
    data: {
        fields: Array<{
            id: string;
            type: 'text' | 'email' | 'number' | 'select' | 'textarea' | 'file' | 'checkbox' | 'radio';
            label: string;
            placeholder?: string;
            required?: boolean;
            validation?: {
                pattern?: string;
                min?: number;
                max?: number;
                message?: string;
            };
            options?: Array<{ value: string; label: string; }>;
        }>;
        submitText?: string;
        cancelText?: string;
    };
}

export interface ImageContent {
    type: 'image';
    data: {
        url?: string;
        base64?: string;
        alt?: string;
        caption?: string;
        width?: number;
        height?: number;
        style?: {
            rounded?: boolean;
            bordered?: boolean;
            shadow?: boolean;
        };
    };
}

export interface FileContent {
    type: 'file';
    data: {
        filename: string;
        url?: string;
        base64?: string;
        mimeType: string;
        size?: number;
        downloadable?: boolean;
        preview?: boolean;
    };
}

export interface InteractiveContent {
    type: 'interactive';
    data: {
        interactiveType: 'singleChoice' | 'multipleChoice' | 'quickReplies' | 'suggestions';
        title?: string;
        options: Array<{
            id: string;
            label: string;
            value: unknown;
            icon?: string;
            description?: string;
        }>;
        maxSelections?: number;
        minSelections?: number;
        allowCustomInput?: boolean;
    };
}

// ==========================================
// ACTION TYPES
// ==========================================

export interface ActionData {
    id: string;
    type: 'quickReply' | 'suggestion' | 'multipleChoice' | 'singleChoice';
    label: string;
    value: unknown;
    icon?: string;
    description?: string;
}

