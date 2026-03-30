<script setup lang="ts">
import { TTSButton, useTTS } from "@tts2go/vue";

const VOICE_ID = "f0f3883e-1c23-484b-9149-7ae0b5e78b78";

const sampleTexts = [
  "Welcome to TTS2Go! This is a text-to-speech demo powered by our Vue SDK.",
  "You can add speech to any text on your website with just a few lines of code.",
  "TTS2Go supports multiple voices and handles audio playback automatically.",
];

const samples = sampleTexts.map((text) => ({
  text,
  tts: useTTS(text, VOICE_ID),
}));

function handleClick(tts: (typeof samples)[number]["tts"]) {
  const s = tts.status.value;
  if (s === "playing" || s === "fallback") {
    tts.stop();
  } else {
    tts.play();
  }
}
</script>

<template>
  <div style="max-width: 640px; margin: 40px auto; font-family: system-ui, sans-serif">
    <h1>TTS2Go Vue Example</h1>

    <section style="margin-bottom: 32px">
      <h2>Pre-built TTSButton</h2>
      <p>
        Click the speaker icon to hear this text read aloud.
        <TTSButton
          content="Click the speaker icon to hear this text read aloud."
          :voiceId="VOICE_ID"
        />
      </p>
    </section>

    <section>
      <h2>Custom Controls with useTTS Composable</h2>
      <div
        v-for="({ text, tts }, i) in samples"
        :key="i"
        style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px"
      >
        <p style="margin: 0 0 12px">{{ text }}</p>
        <div style="display: flex; align-items: center; gap: 8px">
          <button
            @click="handleClick(tts)"
            :disabled="tts.status.value === 'loading'"
            style="padding: 6px 16px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer"
          >
            {{
              tts.status.value === "loading"
                ? "Loading..."
                : tts.status.value === "playing" || tts.status.value === "fallback"
                  ? "Stop"
                  : "Play"
            }}
          </button>
          <button
            @click="tts.pause()"
            :disabled="tts.status.value !== 'playing'"
            style="padding: 6px 16px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer"
          >
            Pause
          </button>
          <span
            style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px"
            :style="{
              background:
                tts.status.value === 'playing'
                  ? '#d4edda'
                  : tts.status.value === 'error'
                    ? '#f8d7da'
                    : '#e2e3e5',
            }"
          >
            {{ tts.status.value }}
          </span>
        </div>
      </div>
    </section>
  </div>
</template>
