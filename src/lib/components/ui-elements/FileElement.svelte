<script lang="ts">
	import type { FileElement } from '$lib/types/structuredResponse';

	let {
		element,
		messageId,
		onChange
	}: {
		element: FileElement;
		messageId: number | string;
		onChange: (element: any, files: File[], messageId: number | string) => void;
	} = $props();

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files) {
			onChange(element, Array.from(target.files), messageId);
		}
	}
</script>

<div class="flex flex-col gap-2">
	<label class="text-sm font-medium text-white/90">{element.label}</label>
	<input
		type="file"
		accept={element.accept?.join(',')}
		multiple
		class="rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white backdrop-blur-sm transition-colors hover:bg-white/20 focus:border-[#ff6b35] focus:outline-none focus:ring-2 focus:ring-[#ff6b35]/50 file:mr-4 file:rounded file:border-0 file:bg-[#ff6b35] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-[#f7931e]"
		onchange={handleFileChange}
	/>
</div>



