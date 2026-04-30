import { ref, computed, onUnmounted } from "vue";
import {
  AudioPlayer,
  StreamingAudioPlayer,
  handleMiss,
  type TTSStatus,
  type FallbackHandle,
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
  let streamPlayer: StreamingAudioPlayer | null = null;
  let fallbackHandle: FallbackHandle | null = null;
  let mounted = true;
  const instanceId = generateInstanceId();

  function stop() {
    player?.stop();
    player = null;
    streamPlayer?.stop();
    streamPlayer = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;
    releaseAudioLock(instanceId);
    status.value = "idle";
  }

  onUnmounted(() => {
    mounted = false;
    player?.stop();
    player = null;
    streamPlayer?.stop();
    streamPlayer = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;
    releaseAudioLock(instanceId);
  });

  async function play() {
    // Stop any existing playback
    player?.stop();
    player = null;
    streamPlayer?.stop();
    streamPlayer = null;
    fallbackHandle?.cancel();
    fallbackHandle = null;

    // Stop any other playing TTS instance
    acquireAudioLock(instanceId, stop);

    error.value = null;
    status.value = "loading";

    const targetUrl = url.value || client.getCDNUrl(content, voiceId);

    let handled = false;
    function handleFailure() {
      if (handled || !mounted) return;
      handled = true;
      player?.stop();
      player = null;
      url.value = null;

      handleMiss(client, content, voiceId, {
        onStreamReady: () => { if (mounted) status.value = "loading"; },
        onPlaybackStarted: () => { if (mounted) status.value = "playing"; },
        onFallbackStarted: () => { if (mounted) status.value = "fallback"; },
        onEnded: () => {
          if (!mounted) return;
          streamPlayer = null;
          fallbackHandle = null;
          releaseAudioLock(instanceId);
          status.value = "idle";
        },
        onError: () => {
          if (!mounted) return;
          streamPlayer = null;
          fallbackHandle = null;
          releaseAudioLock(instanceId);
          status.value = "error";
          error.value = "TTS not available";
        },
      }).then((result) => {
        if (!mounted) return;
        if (result.kind === "stream" && result.streamPlayer) {
          streamPlayer = result.streamPlayer;
        } else if (result.kind === "fallback" && result.fallback) {
          fallbackHandle = result.fallback;
        } else if (result.kind === "none") {
          releaseAudioLock(instanceId);
          status.value = "error";
          error.value = "TTS not available";
        }
      });
    }

    try {
      player = new AudioPlayer();

      player.onEnded = () => {
        if (mounted) {
          url.value = targetUrl;
          releaseAudioLock(instanceId);
          status.value = "idle";
        }
      };
      player.onError = handleFailure;

      status.value = "playing";
      await player.play(targetUrl);
    } catch {
      handleFailure();
    }
  }

  function pause() {
    if (player?.isPlaying) {
      player.pause();
      status.value = "paused";
    } else if (streamPlayer) {
      streamPlayer.pause();
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
