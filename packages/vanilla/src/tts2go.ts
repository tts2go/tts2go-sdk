import {
  TTS2GoClient,
  AudioPlayer,
  StreamingAudioPlayer,
  handleMiss,
  hasSpeechSynthesis,
  acquireAudioLock,
  releaseAudioLock,
  generateInstanceId,
} from "@tts2go/core";
import type { TTS2GoConfig, TTSStatus, Voice, FallbackHandle } from "@tts2go/core";

export interface TTSInstance {
  play: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getStatus: () => TTSStatus;
  getUrl: () => string | null;
  getError: () => string | null;
  destroy: () => void;
  onStatusChange: ((status: TTSStatus) => void) | null;
}

export class TTS2Go {
  private client: TTS2GoClient;

  constructor(config: TTS2GoConfig) {
    this.client = new TTS2GoClient(config);
  }

  /** Create a TTS instance bound to specific content and voice */
  create(content: string, voiceId: string): TTSInstance {
    const client = this.client;

    let status: TTSStatus = "idle";
    let url: string | null = null;
    let error: string | null = null;
    let player: AudioPlayer | null = null;
    let streamPlayer: StreamingAudioPlayer | null = null;
    let fallbackHandle: FallbackHandle | null = null;
    let destroyed = false;
    const instanceId = generateInstanceId();

    function setStatus(s: TTSStatus) {
      status = s;
      instance.onStatusChange?.(s);
    }

    const instance: TTSInstance = {
      onStatusChange: null,

      async play() {
        // Stop any existing playback
        player?.stop();
        player = null;
        fallbackHandle?.cancel();
        fallbackHandle = null;

        // Stop any other playing TTS instance
        acquireAudioLock(instanceId, instance.stop);

        error = null;
        setStatus("loading");

        const targetUrl = url || client.getCDNUrl(content, voiceId);

        let handled = false;
        function handleFailure() {
          if (handled || destroyed) return;
          handled = true;
          player?.stop();
          player = null;
          url = null;

          handleMiss(client, content, voiceId, {
            onStreamReady: () => { if (!destroyed) setStatus("loading"); },
            onPlaybackStarted: () => { if (!destroyed) setStatus("playing"); },
            onFallbackStarted: () => { if (!destroyed) setStatus("fallback"); },
            onEnded: () => {
              if (destroyed) return;
              streamPlayer = null;
              fallbackHandle = null;
              releaseAudioLock(instanceId);
              setStatus("idle");
            },
            onError: () => {
              if (destroyed) return;
              streamPlayer = null;
              fallbackHandle = null;
              error = "TTS not available";
              releaseAudioLock(instanceId);
              setStatus("error");
            },
          }).then((result) => {
            if (destroyed) return;
            if (result.kind === "stream" && result.streamPlayer) {
              streamPlayer = result.streamPlayer;
            } else if (result.kind === "fallback" && result.fallback) {
              fallbackHandle = result.fallback;
            } else if (result.kind === "none") {
              error = "TTS not available";
              releaseAudioLock(instanceId);
              setStatus("error");
            }
          });
        }

        try {
          player = new AudioPlayer();

          player.onEnded = () => {
            if (!destroyed) {
              url = targetUrl;
              releaseAudioLock(instanceId);
              setStatus("idle");
            }
          };
          player.onError = handleFailure;

          setStatus("playing");
          await player.play(targetUrl);
        } catch {
          handleFailure();
        }
      },

      stop() {
        player?.stop();
        player = null;
        streamPlayer?.stop();
        streamPlayer = null;
        fallbackHandle?.cancel();
        fallbackHandle = null;
        releaseAudioLock(instanceId);
        setStatus("idle");
      },

      pause() {
        if (player?.isPlaying) {
          player.pause();
          setStatus("paused");
        } else if (streamPlayer) {
          streamPlayer.pause();
          setStatus("paused");
        }
      },

      resume() {
        if (player?.isPaused) {
          player.resume();
          setStatus("playing");
        } else if (streamPlayer) {
          streamPlayer.resume();
          setStatus("playing");
        }
      },

      getStatus: () => status,
      getUrl: () => url,
      getError: () => error,

      destroy() {
        destroyed = true;
        instance.stop();
      },
    };

    return instance;
  }

  /** Whether the browser supports native speech synthesis (fallback TTS) */
  get browserTTSSupported(): boolean {
    return hasSpeechSynthesis();
  }

  /** Get available voices */
  async getVoices(): Promise<Voice[]> {
    return this.client.getVoices();
  }

  /** One-shot: generate and play audio immediately */
  async generate(content: string, voiceId: string): Promise<TTSInstance> {
    const instance = this.create(content, voiceId);
    await instance.play();
    return instance;
  }
}
