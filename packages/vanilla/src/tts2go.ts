import {
  TTS2GoClient,
  AudioPlayer,
  hasSpeechSynthesis,
  speakFallback,
  stopFallback,
  acquireAudioLock,
  releaseAudioLock,
  generateInstanceId,
} from "@tts2go/core";
import type { TTS2GoConfig, TTSStatus, Voice, FallbackHandle } from "@tts2go/core";

export type TTSEventMap = {
  statusChange: TTSStatus;
  urlReady: string;
  error: string;
  play: void;
  pause: void;
  stop: void;
  timeUpdate: { currentTime: number; duration: number };
};

export type TTSEventCallback<K extends keyof TTSEventMap> = (value: TTSEventMap[K]) => void;

export interface TTSInstance {
  play: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  getStatus: () => TTSStatus;
  getUrl: () => string | null;
  getError: () => string | null;
  destroy: () => void;
  on: <K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) => void;
  off: <K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) => void;
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
    let fallbackHandle: FallbackHandle | null = null;
    let destroyed = false;
    const instanceId = generateInstanceId();

    const listeners = new Map<keyof TTSEventMap, Set<(value: any) => void>>();

    function emit<K extends keyof TTSEventMap>(event: K, value: TTSEventMap[K]) {
      listeners.get(event)?.forEach((cb) => cb(value));
    }

    function setStatus(s: TTSStatus) {
      status = s;
      emit("statusChange", s);
    }

    const instance: TTSInstance = {
      async play() {
        error = null;

        // Stop any existing playback from this instance
        player?.stop();
        player = null;
        fallbackHandle?.cancel();
        fallbackHandle = null;

        // Stop any other playing TTS instance
        acquireAudioLock(instanceId, instance.stop);

        try {
          const targetUrl = url || client.getCDNUrl(content, voiceId);
          const isFirstAttempt = !url;

          if (!isFirstAttempt) {
            // We have a confirmed-working URL — play with error handling
            setStatus("playing");
            emit("play", undefined as any);
            player = new AudioPlayer();

            player.onEnded = () => {
              if (!destroyed) {
                releaseAudioLock(instanceId);
                setStatus("idle");
              }
            };
            player.onError = () => {
              if (!destroyed) {
                error = "Audio playback failed";
                releaseAudioLock(instanceId);
                setStatus("error");
                emit("error", error);
              }
            };
            player.onTimeUpdate = (currentTime, duration) => {
              if (!destroyed) emit("timeUpdate", { currentTime, duration });
            };

            await player.play(targetUrl);
            return;
          }

          // First attempt — try CDN, fallback to browser TTS on failure
          setStatus("loading");

          player = new AudioPlayer();

          let handled = false;
          function handleCdnFailure() {
            if (handled || destroyed) return;
            handled = true;
            player?.stop();
            player = null;

            try { client.request(content, voiceId).catch(() => {}); } catch {}

            if (hasSpeechSynthesis()) {
              setStatus("fallback");
              fallbackHandle = speakFallback(content, () => {
                if (!destroyed) {
                  releaseAudioLock(instanceId);
                  setStatus("idle");
                }
              });
            } else {
              error = "TTS not available";
              releaseAudioLock(instanceId);
              setStatus("error");
              emit("error", error);
            }
          }

          player.onEnded = () => {
            if (!destroyed) {
              releaseAudioLock(instanceId);
              setStatus("idle");
            }
          };
          player.onError = handleCdnFailure;
          player.onTimeUpdate = (currentTime, duration) => {
            if (!destroyed) emit("timeUpdate", { currentTime, duration });
          };

          try {
            setStatus("playing");
            emit("play", undefined as any);
            await player.play(targetUrl);
            // CDN playback started successfully — cache the URL
            if (!destroyed) {
              url = targetUrl;
              emit("urlReady", targetUrl);
            }
          } catch {
            handleCdnFailure();
          }
        } catch (err) {
          if (destroyed) return;
          const msg = err instanceof Error ? err.message : "Playback failed";
          error = msg;
          releaseAudioLock(instanceId);
          setStatus("error");
          emit("error", msg);
        }
      },

      stop() {
        player?.stop();
        player = null;
        fallbackHandle?.cancel();
        fallbackHandle = null;
        releaseAudioLock(instanceId);
        setStatus("idle");
        emit("stop", undefined as any);
      },

      pause() {
        if (player?.isPlaying) {
          player.pause();
          setStatus("paused");
          emit("pause", undefined as any);
        }
      },

      resume() {
        if (player?.isPaused) {
          player.resume();
          setStatus("playing");
          emit("play", undefined as any);
        }
      },

      getStatus: () => status,
      getUrl: () => url,
      getError: () => error,

      destroy() {
        destroyed = true;
        instance.stop();
        listeners.clear();
      },

      on<K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) {
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event)!.add(cb);
      },

      off<K extends keyof TTSEventMap>(event: K, cb: TTSEventCallback<K>) {
        listeners.get(event)?.delete(cb);
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
