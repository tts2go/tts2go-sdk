import { ref, computed, onUnmounted } from "vue";
import {
  AudioPlayer,
  type TTSStatus,
  type FallbackHandle,
  hasSpeechSynthesis,
  speakFallback,
  stopFallback,
  acquireAudioLock,
  releaseAudioLock,
  generateInstanceId,
} from "@tts2go/core";
import { TTS2GoKey, type TTS2GoContext } from "./plugin";
import { inject } from "vue";

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
  let fallbackHandle: FallbackHandle | null = null;
  let mounted = true;
  const instanceId = generateInstanceId();

  function stop() {
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;
    releaseAudioLock(instanceId);
    status.value = "idle";
  }

  onUnmounted(() => {
    mounted = false;
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;
    releaseAudioLock(instanceId);
  });

  async function play() {
    error.value = null;

    // Stop any existing playback from this instance
    player?.stop();
    player = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;

    // Stop any other playing TTS instance
    acquireAudioLock(instanceId, stop);

    try {
      const targetUrl = url.value || client.getCDNUrl(content, voiceId);
      const isFirstAttempt = !url.value;

      if (!isFirstAttempt) {
        // We have a confirmed-working URL — play with error handling
        status.value = "playing";
        player = new AudioPlayer();

        player.onEnded = () => {
          if (mounted) {
            releaseAudioLock(instanceId);
            status.value = "idle";
          }
        };
        player.onError = () => {
          if (mounted) {
            releaseAudioLock(instanceId);
            status.value = "error";
            error.value = "Audio playback failed";
          }
        };

        await player.play(targetUrl);
        return;
      }

      // First attempt — try CDN, fallback to browser TTS on failure
      status.value = "loading";

      player = new AudioPlayer();

      let handled = false;
      function handleCdnFailure() {
        if (handled || !mounted) return;
        handled = true;
        player?.stop();
        player = null;

        try { client.request(content, voiceId).catch(() => {}); } catch {}

        if (hasSpeechSynthesis()) {
          status.value = "fallback";
          fallbackHandle = speakFallback(content, () => {
            if (mounted) {
              releaseAudioLock(instanceId);
              status.value = "idle";
            }
          });
        } else {
          releaseAudioLock(instanceId);
          status.value = "error";
          error.value = "TTS not available";
        }
      }

      player.onEnded = () => {
        if (mounted) {
          releaseAudioLock(instanceId);
          status.value = "idle";
        }
      };
      player.onError = handleCdnFailure;

      try {
        status.value = "playing";
        await player.play(targetUrl);
        if (mounted) url.value = targetUrl;
      } catch {
        handleCdnFailure();
      }
    } catch (err) {
      if (!mounted) return;
      releaseAudioLock(instanceId);
      status.value = "error";
      error.value = err instanceof Error ? err.message : "Playback failed";
    }
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
