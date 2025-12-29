<script lang="ts">
	import type { CodeSection } from '$lib/types/structuredResponse';
	import CodeBlock from '$lib/components/blocks/CodeBlock.svelte';

	let { section }: { section: CodeSection } = $props();
</script>

<CodeBlock language={section.language} content={section.code} />



