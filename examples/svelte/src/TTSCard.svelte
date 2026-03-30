<script lang="ts">
  import { createTTS, type TTSStore } from "@tts2go/svelte";
  import type { TTS2GoClient } from "@tts2go/core";

  const { client, text, voiceId }: { client: TTS2GoClient; text: string; voiceId: string } = $props();

  // Props are static for this component — voiceId won't change after mount
  const tts = createTTS(client, text, voiceId);

  let status = $state("idle");
  const unsubscribe = tts.status.subscribe((s) => (status = s));

  function handleClick() {
    if (status === "playing" || status === "fallback") {
      tts.stop();
    } else {
      tts.play();
    }
  }

  $effect(() => {
    return () => {
      unsubscribe();
      tts.destroy();
    };
  });
</script>

<div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
  <p style="margin: 0 0 12px;">{text}</p>
  <div style="display: flex; align-items: center; gap: 8px;">
    <button
      onclick={handleClick}
      disabled={status === "loading"}
      style="padding: 6px 16px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer;"
    >
      {#if status === "loading"}
        Loading...
      {:else if status === "playing" || status === "fallback"}
        Stop
      {:else}
        Play
      {/if}
    </button>
    <button
      onclick={() => tts.pause()}
      disabled={status !== "playing"}
      style="padding: 6px 16px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer;"
    >
      Pause
    </button>
    <span
      style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: {status === 'playing' ? '#d4edda' : status === 'error' ? '#f8d7da' : '#e2e3e5'};"
    >
      {status}
    </span>
  </div>
</div>
