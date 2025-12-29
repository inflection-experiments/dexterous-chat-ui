<script lang="ts">
	import type { HeadingSection } from '$lib/types/structuredResponse';
	import { parseInlineFormatting } from '$lib/utils/markdownParser';

	let { section }: { section: HeadingSection } = $props();

	const headingClasses = {
		1: 'mt-4 mb-3 border-b-2 border-[#ff6b35] pb-2 text-2xl font-bold text-white first:mt-0',
		2: 'mt-4 mb-2 text-xl font-semibold text-white first:mt-0',
		3: 'mt-3 mb-2 text-lg font-semibold text-white first:mt-0',
		4: 'mt-3 mb-2 text-base font-semibold text-white first:mt-0'
	};
</script>

{#if section.level === 1}
	<h1 class={headingClasses[1]}>
		{#if section.icon}
			<span class="mr-2">{section.icon}</span>
		{/if}
		{@html parseInlineFormatting(section.text)}
	</h1>
{:else if section.level === 2}
	<h2 class={headingClasses[2]}>
		{#if section.icon}
			<span class="mr-2">{section.icon}</span>
		{/if}
		{@html parseInlineFormatting(section.text)}
	</h2>
{:else if section.level === 3}
	<h3 class={headingClasses[3]}>
		{#if section.icon}
			<span class="mr-2">{section.icon}</span>
		{/if}
		{@html parseInlineFormatting(section.text)}
	</h3>
{:else if section.level === 4}
	<h4 class={headingClasses[4]}>
		{#if section.icon}
			<span class="mr-2">{section.icon}</span>
		{/if}
		{@html parseInlineFormatting(section.text)}
	</h4>
{/if}



