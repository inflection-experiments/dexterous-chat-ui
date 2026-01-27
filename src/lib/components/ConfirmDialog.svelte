<script lang="ts">
	interface ConfirmDialogProps {
		open: boolean;
		title?: string;
		message?: string;
		confirmText?: string;
		cancelText?: string;
		confirmButtonClass?: string;
		cancelButtonClass?: string;
		isLoading?: boolean;
		variant?: 'danger' | 'warning' | 'info';
		onConfirm: () => void | Promise<void>;
		onCancel: () => void;
	}

	let {
		open,
		title = 'Confirm Action',
		message = 'Are you sure you want to proceed?',
		confirmText = 'Confirm',
		cancelText = 'Cancel',
		confirmButtonClass = '',
		cancelButtonClass = '',
		isLoading = false,
		variant = 'danger',
		onConfirm,
		onCancel
	}: ConfirmDialogProps = $props();

	const handleConfirm = async () => {
		await onConfirm();
	};

	const handleCancel = () => {
		onCancel();
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			handleCancel();
		}
	};

	// Variant-based button styles
	const getConfirmButtonStyles = () => {
		if (confirmButtonClass) return confirmButtonClass;

		const baseStyles =
			'flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50';

		switch (variant) {
			case 'danger':
				return `${baseStyles} bg-gradient-to-br from-red-500 to-red-600`;
			case 'warning':
				return `${baseStyles} bg-gradient-to-br from-yellow-500 to-yellow-600`;
			case 'info':
				return `${baseStyles} bg-gradient-to-br from-blue-500 to-blue-600`;
			default:
				return `${baseStyles} bg-gradient-to-br from-red-500 to-red-600`;
		}
	};

	const getCancelButtonStyles = () => {
		if (cancelButtonClass) return cancelButtonClass;
		return 'flex-1 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 disabled:opacity-50';
	};
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
		onclick={handleCancel}
		onkeydown={handleKeyDown}
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-dialog-title"
		tabindex="-1"
	>
		<div
			class="relative mx-4 w-full max-w-md rounded-2xl border border-white/20 bg-[rgba(20,20,35,0.95)] p-6 shadow-2xl backdrop-blur-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="none"
		>
			<div class="mb-4">
				<h3 id="confirm-dialog-title" class="mb-2 text-xl font-semibold text-white">
					{title}
				</h3>
				<p class="text-sm text-white/70">
					{message}
				</p>
			</div>
			<div class="flex gap-3">
				<button onclick={handleCancel} disabled={isLoading} class={getCancelButtonStyles()}>
					{cancelText}
				</button>
				<button onclick={handleConfirm} disabled={isLoading} class={getConfirmButtonStyles()}>
					{isLoading ? 'Processing...' : confirmText}
				</button>
			</div>
		</div>
	</div>
{/if}
