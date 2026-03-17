import { ref, computed, onMounted, onUnmounted, inject } from "vue";
import { AudioPlayer, type TTSStatus } from "@tts2go/core";
import { hasSpeechSynthesis, speakFallback, stopFallback } from "@tts2go/core";
import type { TTS2GoClient } from "@tts2go/core";
import { TTS2GoKey } from "./plugin";

export function useTTS(content: string, voiceId: string) {
  const injectedClient = inject(TTS2GoKey);
  if (!injectedClient) {
    throw new Error("useTTS must be used within a component with TTS2GoPlugin installed");
  }
  const client = injectedClient;

  const status = ref<TTSStatus>("idle");
  const url = ref<string | null>(null);
  const error = ref<string | null>(null);
  let player: AudioPlayer | null = null;
  let mounted = true;

  // Check CDN on mount
  onMounted(async () => {
    try {
      const result = await client.check(content, voiceId);
      if (mounted && result.exists && result.url) {
        url.value = result.url;
      }
    } catch {
      // Silently fail CDN check
    }
  });

  onUnmounted(() => {
    mounted = false;
    player?.stop();
    player = null;
  });

  async function playAudioFromUrl(audioUrl: string) {
    status.value = "playing";
    player = new AudioPlayer();

    player.onEnded = () => {
      if (mounted) status.value = "idle";
    };
    player.onError = () => {
      if (mounted) {
        status.value = "error";
        error.value = "Audio playback failed";
      }
    };

    await player.play(audioUrl);
  }

  async function play() {
    error.value = null;

    try {
      if (url.value) {
        await playAudioFromUrl(url.value);
        return;
      }

      status.value = "loading";
      try {
        const result = await client.requestAndPoll(content, voiceId);
        if (!mounted) return;

        url.value = result.url;
        await playAudioFromUrl(result.url);
      } catch (err) {
        if (!mounted) return;

        if (hasSpeechSynthesis()) {
          status.value = "fallback";
          speakFallback(content);
          const estimatedDuration = Math.max(2000, content.length * 60);
          setTimeout(() => {
            if (mounted) status.value = "idle";
          }, estimatedDuration);
        } else {
          status.value = "error";
          error.value = err instanceof Error ? err.message : "TTS generation failed";
        }
      }
    } catch (err) {
      if (!mounted) return;
      status.value = "error";
      error.value = err instanceof Error ? err.message : "Playback failed";
    }
  }

  function stop() {
    player?.stop();
    player = null;
    stopFallback();
    status.value = "idle";
  }

  function pause() {
    if (player?.isPlaying) {
      player.pause();
      status.value = "paused";
    }
  }

  return {
    status: computed(() => status.value),
    url: computed(() => url.value),
    error: computed(() => error.value),
    play,
    stop,
    pause,
  };
}
