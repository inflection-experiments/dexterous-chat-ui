<script lang="ts">
  import { goto } from '$app/navigation';
  import Icon from '@iconify/svelte';

  function navigateToChat() {
    goto('/user/74f22a5f-8ed2-45ce-af2e-ac4c32d824f4/dexterous');
  }
</script>

<div
  class="flex h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a0a1a] via-[#1a1a2e] to-[#0f0f23] font-sans text-white antialiased"
  style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;"
>
  <div class="flex flex-col items-center gap-6">
    <div class="flex items-center gap-3 mb-2">
      <div
        class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#f7931e] text-white shadow-[0_4px_16px_rgba(255,107,53,0.3)]"
      >
        <Icon icon="mdi:layers" width="28" height="28" />
      </div>
      <span class="text-2xl font-bold tracking-tight text-white" style="letter-spacing: -0.02em;">
        Dexterous AI
      </span>
    </div>
    <button
      onclick={navigateToChat}
      class="flex cursor-pointer items-center gap-3 rounded-xl border-none bg-gradient-to-br from-[#ff6b35] to-[#f7931e] px-6 py-4 text-base font-semibold text-white shadow-[0_4px_12px_rgba(255,107,53,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(255,107,53,0.35)] active:translate-y-0"
      style="transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
    >
      <Icon icon="mdi:chat-outline" width="20" height="20" />
      <span>Go to Chat Page</span>
    </button>
  </div>
</div>