<script lang="ts">
	import type { McpToolName, McpFormValues, McpValidationError } from '$lib/types/mcp.types';
	import {
		getToolConfig,
		getDefaultValues,
		validateFormValues,
		buildRequestParams
	} from '$lib/utils/mcpFormState';
	import Icon from '@iconify/svelte';

	let {
		toolName,
		userId,
		isLoading,
		onSubmit
	}: {
		toolName: McpToolName;
		userId: string;
		isLoading: boolean;
		onSubmit: (toolName: McpToolName, params: Record<string, any>) => void;
	} = $props();

	let formValues = $state<McpFormValues>(getDefaultValues(toolName, userId));
	let errors = $state<McpValidationError[]>([]);

	// Reset form when tool changes
	$effect(() => {
		formValues = getDefaultValues(toolName, userId);
		errors = [];
	});

	const toolConfig = $derived(getToolConfig(toolName));

	const getFieldError = (fieldName: string): string | undefined => {
		return errors.find((e) => e.field === fieldName)?.message;
	};

	const handleSubmit = () => {
		const validationErrors = validateFormValues(toolName, formValues);
		errors = validationErrors;
		if (validationErrors.length > 0) return;

		const params = buildRequestParams(toolName, formValues);
		onSubmit(toolName, params);
	};

	const handleReset = () => {
		formValues = getDefaultValues(toolName, userId);
		errors = [];
	};

	const handleNumberInput = (fieldName: string, event: Event) => {
		const target = event.target as HTMLInputElement;
		const val = target.value;
		formValues[fieldName] = val === '' ? undefined : Number(val);
	};

	const handleBooleanToggle = (fieldName: string) => {
		formValues[fieldName] = !formValues[fieldName];
	};
</script>

<div class="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
	<h3 class="mb-5 text-lg font-semibold text-white">
		{toolConfig.displayName}
	</h3>

	<form
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
		class="space-y-4"
	>
		{#each toolConfig.fields as field (field.name)}
			{@const fieldError = getFieldError(field.name)}
			<div>
				<label for="mcp-{field.name}" class="mb-1.5 block text-sm font-semibold text-white/90">
					{field.label}
					{#if field.required}
						<span class="text-[#ff6b35]">*</span>
					{/if}
				</label>

				{#if field.description}
					<p class="mb-1.5 text-xs text-white/50">{field.description}</p>
				{/if}

				{#if field.type === 'textarea' || field.type === 'json'}
					<textarea
						id="mcp-{field.name}"
						value={String(formValues[field.name] ?? '')}
						oninput={(e) => {
							formValues[field.name] = (e.target as HTMLTextAreaElement).value;
						}}
						placeholder={field.placeholder}
						rows={field.type === 'json' ? 3 : 4}
						class="w-full resize-y rounded-lg border bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-sm transition-all duration-200 placeholder:text-white/30 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50
							{field.type === 'json' ? 'font-mono' : ''}
							{fieldError ? 'border-red-400/60' : 'border-white/20 focus:border-[#ff6b35]'}"
					></textarea>
				{:else if field.type === 'number'}
					<input
						id="mcp-{field.name}"
						type="number"
						value={formValues[field.name] !== undefined ? String(formValues[field.name]) : ''}
						oninput={(e) => handleNumberInput(field.name, e)}
						placeholder={field.placeholder}
						min={field.min}
						max={field.max}
						class="w-full rounded-lg border bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-sm transition-all duration-200 placeholder:text-white/30 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50
							{fieldError ? 'border-red-400/60' : 'border-white/20 focus:border-[#ff6b35]'}"
					/>
				{:else if field.type === 'boolean'}
					<button
						id="mcp-{field.name}"
						type="button"
						onclick={() => handleBooleanToggle(field.name)}
						class="flex items-center gap-3 rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/90 transition-all duration-200 hover:bg-white/10"
					>
						<div
							class="relative h-6 w-11 rounded-full transition-colors duration-200
								{formValues[field.name] ? 'bg-[#ff6b35]' : 'bg-white/20'}"
						>
							<div
								class="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
									{formValues[field.name] ? 'translate-x-5' : 'translate-x-0.5'}"
							></div>
						</div>
						<span>{formValues[field.name] ? 'Enabled' : 'Disabled'}</span>
					</button>
				{:else}
					<input
						id="mcp-{field.name}"
						type="text"
						value={String(formValues[field.name] ?? '')}
						oninput={(e) => {
							formValues[field.name] = (e.target as HTMLInputElement).value;
						}}
						placeholder={field.placeholder}
						class="w-full rounded-lg border bg-white/10 px-4 py-3 text-sm text-white backdrop-blur-sm transition-all duration-200 placeholder:text-white/30 focus:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50
							{fieldError ? 'border-red-400/60' : 'border-white/20 focus:border-[#ff6b35]'}"
					/>
				{/if}

				{#if fieldError}
					<p class="mt-1 text-xs text-red-400">{fieldError}</p>
				{/if}
			</div>
		{/each}

		<div class="flex items-center gap-3 pt-2">
			<button
				type="submit"
				disabled={isLoading}
				class="flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.4)] disabled:opacity-50 disabled:hover:translate-y-0"
			>
				{#if isLoading}
					<Icon icon="mdi:loading" width="18" height="18" class="animate-spin" />
					<span>Executing...</span>
				{:else}
					<Icon icon="mdi:play" width="18" height="18" />
					<span>Execute</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={handleReset}
				disabled={isLoading}
				class="rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 disabled:opacity-50"
			>
				Reset
			</button>
		</div>
	</form>
</div>
