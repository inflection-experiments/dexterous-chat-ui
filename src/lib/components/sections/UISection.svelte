<script lang="ts">
	import type { UISection, UIElement } from '$lib/types/structuredResponse';
	import ButtonElement from '$lib/components/ui-elements/ButtonElement.svelte';
	import DropdownElement from '$lib/components/ui-elements/DropdownElement.svelte';
	import RadioGroupElement from '$lib/components/ui-elements/RadioGroupElement.svelte';
	import CheckboxGroupElement from '$lib/components/ui-elements/CheckboxGroupElement.svelte';
	import InputElement from '$lib/components/ui-elements/InputElement.svelte';
	import TextareaElement from '$lib/components/ui-elements/TextareaElement.svelte';
	import FileElement from '$lib/components/ui-elements/FileElement.svelte';
	import DateElement from '$lib/components/ui-elements/DateElement.svelte';
	import SliderElement from '$lib/components/ui-elements/SliderElement.svelte';
	import ToggleElement from '$lib/components/ui-elements/ToggleElement.svelte';

	let {
		section,
		messageId,
		onButtonAction,
		onDropdownChange,
		onRadioChange,
		onCheckboxChange,
		onInputChange,
		onTextareaChange,
		onFileChange,
		onDateChange,
		onSliderChange,
		onToggleChange
	}: {
		section: UISection;
		messageId: number | string;
		onButtonAction?: (button: any, messageId: number | string) => void;
		onDropdownChange?: (element: any, value: string, messageId: number | string) => void;
		onRadioChange?: (element: any, value: string, messageId: number | string) => void;
		onCheckboxChange?: (element: any, values: string[], messageId: number | string) => void;
		onInputChange?: (element: any, value: string, messageId: number | string) => void;
		onTextareaChange?: (element: any, value: string, messageId: number | string) => void;
		onFileChange?: (element: any, files: File[], messageId: number | string) => void;
		onDateChange?: (element: any, value: string, messageId: number | string) => void;
		onSliderChange?: (element: any, value: number, messageId: number | string) => void;
		onToggleChange?: (element: any, value: boolean, messageId: number | string) => void;
	} = $props();
</script>

<div class="my-4 space-y-4">
	{#each section.uiElements as element}
		{#if element.type === 'button'}
			<ButtonElement
				element={element}
				{messageId}
				onClick={onButtonAction || (() => {})}
			/>
		{:else if element.type === 'dropdown'}
			<DropdownElement
				element={element}
				{messageId}
				onChange={onDropdownChange || (() => {})}
			/>
		{:else if element.type === 'radio'}
			<RadioGroupElement
				element={element}
				{messageId}
				onChange={onRadioChange || (() => {})}
			/>
		{:else if element.type === 'checkbox'}
			<CheckboxGroupElement
				element={element}
				{messageId}
				onChange={onCheckboxChange || (() => {})}
			/>
		{:else if element.type === 'input'}
			<InputElement
				element={element}
				{messageId}
				onChange={onInputChange || (() => {})}
			/>
		{:else if element.type === 'textarea'}
			<TextareaElement
				element={element}
				{messageId}
				onChange={onTextareaChange || (() => {})}
			/>
		{:else if element.type === 'file'}
			<FileElement
				element={element}
				{messageId}
				onChange={onFileChange || (() => {})}
			/>
		{:else if element.type === 'date' || element.type === 'time' || element.type === 'datetime'}
			<DateElement
				element={element}
				{messageId}
				onChange={onDateChange || (() => {})}
			/>
		{:else if element.type === 'slider'}
			<SliderElement
				element={element}
				{messageId}
				onChange={onSliderChange || (() => {})}
			/>
		{:else if element.type === 'toggle'}
			<ToggleElement
				element={element}
				{messageId}
				onChange={onToggleChange || (() => {})}
			/>
		{/if}
	{/each}
</div>



