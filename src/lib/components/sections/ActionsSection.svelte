<script lang="ts">
	import type { ActionsSection } from '$lib/types/structuredResponse';
	import ButtonElement from '$lib/components/ui-elements/ButtonElement.svelte';

	let {
		section,
		messageId,
		onButtonAction
	}: {
		section: ActionsSection;
		messageId: number | string;
		onButtonAction?: (button: any, messageId: number | string) => void;
	} = $props();
</script>

<div class="my-4 flex flex-wrap gap-3">
	{#each section.buttons as button}
		<ButtonElement
			element={button}
			{messageId}
			onClick={onButtonAction || (() => {})}
		/>
	{/each}
</div>



