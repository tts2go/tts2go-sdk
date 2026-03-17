<template>
  <button
    type="button"
    role="button"
    :class="className"
    :style="buttonStyle"
    :aria-label="ariaLabel"
    :disabled="status === 'loading'"
    :title="ariaLabel"
    @click="handleClick"
  >
    <!-- Idle: Speaker icon -->
    <svg v-if="status === 'idle'" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>

    <!-- Loading: Spinner -->
    <svg v-else-if="status === 'loading'" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" opacity="1">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>

    <!-- Playing / Fallback: Sound waves -->
    <svg v-else-if="status === 'playing' || status === 'fallback'" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="10" width="3" height="4" rx="1">
        <animate attributeName="height" values="4;14;4" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="10;5;10" dur="0.8s" repeatCount="indefinite" />
      </rect>
      <rect x="10" y="8" width="3" height="8" rx="1">
        <animate attributeName="height" values="8;4;8" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
        <animate attributeName="y" values="8;10;8" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
      </rect>
      <rect x="16" y="6" width="3" height="12" rx="1">
        <animate attributeName="height" values="12;6;12" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
        <animate attributeName="y" values="6;9;6" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
      </rect>
    </svg>

    <!-- Paused -->
    <svg v-else-if="status === 'paused'" :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>

    <!-- Error: Speaker with X -->
    <svg v-else :width="iconSize" :height="iconSize" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useTTS } from "./useTTS";

const props = withDefaults(
  defineProps<{
    content: string;
    voiceId: string;
    className?: string;
    size?: number;
  }>(),
  {
    className: "",
    size: 24,
  }
);

const iconSize = computed(() => props.size);

const { status, play, stop } = useTTS(props.content, props.voiceId);

const buttonStyle = computed(() => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "4px",
  borderRadius: "4px",
  transition: "opacity 0.2s",
}));

const ariaLabel = computed(() => {
  switch (status.value) {
    case "loading":
      return "Loading audio...";
    case "playing":
    case "fallback":
      return "Stop audio";
    case "paused":
      return "Resume audio";
    case "error":
      return "Audio error, click to retry";
    default:
      return "Play audio";
  }
});

function handleClick() {
  switch (status.value) {
    case "playing":
    case "fallback":
      stop();
      break;
    case "paused":
      play();
      break;
    case "loading":
      break;
    default:
      play();
      break;
  }
}
</script>
