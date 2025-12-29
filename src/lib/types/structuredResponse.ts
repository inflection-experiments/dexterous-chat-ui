// Structured Response Types for Agent Responses
// This format uses LLMUIResponse blocks for rendering

import type { LLMUIResponse } from './llmUIResponse';

export interface StructuredResponse {
	blocks: LLMUIResponse['blocks']; // ordered blocks, render top → bottom
}

export type ResponseSection =
	| HeadingSection
	| MarkdownSection
	| CodeSection
	| TableSection
	| ListSection
	| SummarySection
	| AlertSection
	| DividerSection
	| UISection
	| ActionsSection
	| PlaceholderSection;

export interface HeadingSection {
	type: 'heading';
	level: 1 | 2 | 3 | 4;
	text: string;
	icon?: string;
}

export interface MarkdownSection {
	type: 'markdown';
	content: string; // pure markdown only
}

export interface CodeSection {
	type: 'code';
	language: string;
	code: string;
	filename?: string;
	actions?: Button[];
}

export interface TableSection {
	type: 'table';
	headers: string[];
	rows: string[][];
	caption?: string;
	rowActions?: Button[];
}

export interface ListSection {
	type: 'list';
	variant: 'unordered' | 'ordered' | 'checklist';
	items: Array<{
		text: string;
		checked?: boolean;
	}>;
}

export interface SummarySection {
	type: 'summary';
	items: Array<{
		label: string;
		value: string | number;
		icon?: string;
	}>;
}

export interface AlertSection {
	type: 'alert';
	variant: 'success' | 'warning' | 'error' | 'info';
	title?: string;
	message: string;
}

export interface DividerSection {
	type: 'divider';
	label?: string;
}

export interface UISection {
	type: 'ui';
	uiElements: UIElement[];
}

export interface ActionsSection {
	type: 'actions';
	buttons: Button[];
}

export interface PlaceholderSection {
	type: 'placeholder';
	label?: string;
}

export type UIElement =
	| ButtonElement
	| DropdownElement
	| RadioGroupElement
	| CheckboxGroupElement
	| InputElement
	| TextareaElement
	| FileElement
	| DateElement
	| SliderElement
	| ToggleElement;

export interface ButtonElement {
	type: 'button';
	id: string;
	label: string;
	action: string;
	icon?: string;
	variant?: 'primary' | 'secondary' | 'danger';
	payload?: any;
}

export interface DropdownElement {
	type: 'dropdown';
	id: string;
	label: string;
	action: string;
	placeholder?: string;
	options: Array<{
		value: string;
		label: string;
		description?: string;
	}>;
}

export interface RadioGroupElement {
	type: 'radio';
	id: string;
	label: string;
	action: string;
	options: Array<{
		value: string;
		label: string;
		description?: string;
	}>;
}

export interface CheckboxGroupElement {
	type: 'checkbox';
	id: string;
	label: string;
	action: string;
	options: Array<{
		value: string;
		label: string;
	}>;
}

export interface InputElement {
	type: 'input';
	id: string;
	label: string;
	action: string;
	inputType: 'text' | 'number' | 'email' | 'password';
	placeholder?: string;
	required?: boolean;
}

export interface TextareaElement {
	type: 'textarea';
	id: string;
	label: string;
	action: string;
	placeholder?: string;
}

export interface FileElement {
	type: 'file';
	id: string;
	label: string;
	action: string;
	accept?: string[];
}

export interface DateElement {
	type: 'date' | 'time' | 'datetime';
	id: string;
	label: string;
	action: string;
}

export interface SliderElement {
	type: 'slider';
	id: string;
	label: string;
	action: string;
	min: number;
	max: number;
}

export interface ToggleElement {
	type: 'toggle';
	id: string;
	label: string;
	action: string;
}

export interface Button {
	type: 'button';
	id: string;
	label: string;
	action: string;
	icon?: string;
	variant?: 'primary' | 'secondary' | 'danger';
	payload?: any;
}

export interface NextStep {
	action: string;
	label: string;
	description: string;
	icon?: string;
}

export interface Meta {
	version?: string;
	generatedBy?: string;
	streamable?: boolean;
	correlationId?: string;
	partial?: boolean;
	userId?: string;
	timestamp?: string;
	processedBy?: string;
	userMessageTimestamp?: string;
	assistantMessageTimestamp?: string;
}

