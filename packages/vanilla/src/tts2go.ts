import {
  TTS2GoClient,
  AudioPlayer,
  hasSpeechSynthesis,
  speakFallback,
  stopFallback,
} from "@tts2go/core";
import type { TTS2GoConfig, TTSStatus, Voice, PollOptions } from "@tts2go/core";

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
  private pollOptions?: PollOptions;

  constructor(config: TTS2GoConfig, pollOptions?: PollOptions) {
    this.client = new TTS2GoClient(config);
    this.pollOptions = pollOptions;
  }

  /** Create a TTS instance bound to specific content and voice */
  create(content: string, voiceId: string): TTSInstance {
    const client = this.client;
    const pollOptions = this.pollOptions;

    let status: TTSStatus = "idle";
    let url: string | null = null;
    let error: string | null = null;
    let player: AudioPlayer | null = null;
    let destroyed = false;

    const listeners = new Map<keyof TTSEventMap, Set<(value: any) => void>>();

    function emit<K extends keyof TTSEventMap>(event: K, value: TTSEventMap[K]) {
      listeners.get(event)?.forEach((cb) => cb(value));
    }

    function setStatus(s: TTSStatus) {
      status = s;
      emit("statusChange", s);
    }

    async function playAudioFromUrl(audioUrl: string) {
      setStatus("playing");
      emit("play", undefined as any);
      player = new AudioPlayer();

      player.onEnded = () => {
        if (!destroyed) setStatus("idle");
      };
      player.onError = () => {
        if (!destroyed) {
          error = "Audio playback failed";
          setStatus("error");
          emit("error", error);
        }
      };
      player.onTimeUpdate = (currentTime, duration) => {
        if (!destroyed) emit("timeUpdate", { currentTime, duration });
      };

      await player.play(audioUrl);
    }

    const instance: TTSInstance = {
      async play() {
        error = null;
        try {
          if (url) {
            await playAudioFromUrl(url);
            return;
          }

          setStatus("loading");
          try {
            const result = await client.requestAndPoll(content, voiceId, pollOptions);
            if (destroyed) return;

            url = result.url;
            emit("urlReady", result.url);
            await playAudioFromUrl(result.url);
          } catch (err) {
            if (destroyed) return;

            if (hasSpeechSynthesis()) {
              setStatus("fallback");
              speakFallback(content);
              const estimatedDuration = Math.max(2000, content.length * 60);
              setTimeout(() => {
                if (!destroyed) setStatus("idle");
              }, estimatedDuration);
            } else {
              const msg = err instanceof Error ? err.message : "TTS generation failed";
              error = msg;
              setStatus("error");
              emit("error", msg);
            }
          }
        } catch (err) {
          if (destroyed) return;
          const msg = err instanceof Error ? err.message : "Playback failed";
          error = msg;
          setStatus("error");
          emit("error", msg);
        }
      },

      stop() {
        player?.stop();
        player = null;
        stopFallback();
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
