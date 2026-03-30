<script lang="ts">
  import { createTTS2GoClient, createTTSButton } from "@tts2go/svelte";
  import TTSCard from "./TTSCard.svelte";

  const VOICE_ID = "f0f3883e-1c23-484b-9149-7ae0b5e78b78";

  const client = createTTS2GoClient({
    apiKey: "tts_6eaea2b30538d0568124543533f7bb15401b5c1f9fa1d8ba6566df4f2c8644b7",
    projectId: "e6785bb8-a3d2-4fc9-bc01-57b77c295f66",
  });

  const sampleTexts = [
    "Welcome to TTS2Go! This is a text-to-speech demo powered by our Svelte SDK.",
    "You can add speech to any text on your website with just a few lines of code.",
    "TTS2Go supports multiple voices and handles audio playback automatically.",
  ];

  let buttonTarget: HTMLElement;

  $effect(() => {
    if (buttonTarget) {
      const btn = createTTSButton({
        client,
        content: "Click the speaker icon to hear this text read aloud.",
        voiceId: VOICE_ID,
        target: buttonTarget,
      });
      return () => btn.destroy();
    }
  });
</script>

<div style="max-width: 640px; margin: 40px auto; font-family: system-ui, sans-serif;">
  <h1>TTS2Go Svelte Example</h1>

  <section style="margin-bottom: 32px;">
    <h2>Pre-built TTSButton</h2>
    <p>
      Click the speaker icon to hear this text read aloud.
      <span bind:this={buttonTarget} style="display: inline-block; vertical-align: middle;"></span>
    </p>
  </section>

  <section>
    <h2>Custom Controls with createTTS Store</h2>
    {#each sampleTexts as text}
      <TTSCard {client} {text} voiceId={VOICE_ID} />
    {/each}
  </section>
</div>
