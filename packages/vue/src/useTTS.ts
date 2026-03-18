import { ref, computed, onUnmounted, inject } from "vue";
import { AudioPlayer, type TTSStatus } from "@tts2go/core";
import { hasSpeechSynthesis, speakFallback, stopFallback } from "@tts2go/core";
import { TTS2GoKey, type TTS2GoContext } from "./plugin";

export function useTTS2GoContext(): TTS2GoContext {
  const ctx = inject(TTS2GoKey);
  if (!ctx) {
    throw new Error("useTTS2GoContext must be used within a component with TTS2GoPlugin installed");
  }
  return ctx;
}

export function useTTS(content: string, voiceId: string) {
  const { client } = useTTS2GoContext();

  const status = ref<TTSStatus>("idle");
  const url = ref<string | null>(null);
  const error = ref<string | null>(null);
  let player: AudioPlayer | null = null;
  let mounted = true;

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

      // Try to play directly from CDN
      status.value = "loading";
      const cdnUrl = client.getCDNUrl(content, voiceId);

      player = new AudioPlayer();
      player.onEnded = () => {
        if (mounted) status.value = "idle";
      };
      player.onError = () => {
        if (!mounted) return;
        // Audio failed (likely 404) — fire request and use browser TTS
        client.request(content, voiceId).catch(() => {});
        if (hasSpeechSynthesis()) {
          status.value = "fallback";
          speakFallback(content);
          const estimatedDuration = Math.max(2000, content.length * 60);
          setTimeout(() => {
            if (mounted) status.value = "idle";
          }, estimatedDuration);
        } else {
          status.value = "error";
          error.value = "TTS not available";
        }
      };

      try {
        status.value = "playing";
        url.value = cdnUrl;
        await player.play(cdnUrl);
      } catch {
        if (!mounted) return;
        client.request(content, voiceId).catch(() => {});
        if (hasSpeechSynthesis()) {
          status.value = "fallback";
          speakFallback(content);
          const estimatedDuration = Math.max(2000, content.length * 60);
          setTimeout(() => {
            if (mounted) status.value = "idle";
          }, estimatedDuration);
        } else {
          status.value = "error";
          error.value = "TTS not available";
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
