const MSE_MIME = "audio/mpeg";

export interface StreamingAudioOptions {
  warmupMs?: number;
}

/**
 * Streams chunked MP3 audio into an <audio> element via MediaSource Extensions.
 * Playback starts once `warmupMs` of buffered audio is available to avoid
 * underruns on the opening bytes.
 */
export class StreamingAudioPlayer {
  onEnded?: () => void;
  onError?: (error: unknown) => void;
  onFirstByte?: () => void;
  onPlaybackStarted?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;

  private audio: HTMLAudioElement | null = null;
  private mediaSource: MediaSource | null = null;
  private sourceBuffer: SourceBuffer | null = null;
  private objectUrl: string | null = null;
  private pending: Uint8Array[] = [];
  private appending = false;
  private streamEnded = false;
  private firstByteSeen = false;
  private playbackStarted = false;
  private aborted = false;
  private warmupMs: number;

  constructor(opts: StreamingAudioOptions = {}) {
    this.warmupMs = opts.warmupMs ?? 200;
  }

  static get supported(): boolean {
    if (typeof window === "undefined") return false;
    const MS = (window as any).MediaSource;
    if (!MS || typeof MS.isTypeSupported !== "function") return false;
    try {
      return MS.isTypeSupported(MSE_MIME);
    } catch {
      return false;
    }
  }

  async play(body: ReadableStream<Uint8Array>): Promise<void> {
    if (!StreamingAudioPlayer.supported) {
      throw new Error("MediaSource streaming is not supported in this environment");
    }

    this.audio = new Audio();
    this.audio.preload = "auto";

    this.mediaSource = new MediaSource();
    this.objectUrl = URL.createObjectURL(this.mediaSource);
    this.audio.src = this.objectUrl;

    this.audio.addEventListener("ended", () => this.onEnded?.());
    this.audio.addEventListener("error", (e) => {
      if (this.aborted) return;
      this.fail(e);
    });
    this.audio.addEventListener("timeupdate", () => {
      if (this.audio) {
        this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration);
      }
    });

    await new Promise<void>((resolve, reject) => {
      if (!this.mediaSource) return reject(new Error("MediaSource not initialized"));
      const onOpen = () => {
        this.mediaSource?.removeEventListener("sourceopen", onOpen);
        try {
          this.sourceBuffer = this.mediaSource!.addSourceBuffer(MSE_MIME);
          // Single listener — clear the appending guard, then try to start
          // playback (audio.buffered is now up to date), then drain the
          // next queued chunk. Order matters: drain() reads `appending`.
          this.sourceBuffer.addEventListener("updateend", () => {
            this.appending = false;
            if (!this.playbackStarted) this.maybeStartPlayback();
            this.drain();
          });
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      this.mediaSource.addEventListener("sourceopen", onOpen);
    });

    // Kick off reading in the background so callers can `await play()` without
    // waiting for the full stream.
    this.pump(body).catch((err) => {
      if (!this.aborted) this.fail(err);
    });
  }

  pause(): void {
    this.audio?.pause();
  }

  resume(): void {
    if (this.audio && this.audio.paused) {
      this.audio.play().catch((err) => this.fail(err));
    }
  }

  stop(): void {
    this.aborted = true;
    try {
      this.audio?.pause();
    } catch {
      // ignore
    }
    if (this.audio) {
      this.audio.removeAttribute("src");
      this.audio.load?.();
      this.audio = null;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.pending = [];
  }

  get playbackHasStarted(): boolean {
    return this.playbackStarted;
  }

  private async pump(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    while (true) {
      if (this.aborted) {
        reader.cancel().catch(() => {});
        return;
      }
      const { value, done } = await reader.read();
      if (done) break;
      if (!value || value.length === 0) continue;
      if (!this.firstByteSeen) {
        this.firstByteSeen = true;
        this.onFirstByte?.();
      }
      this.pending.push(value);
      this.drain();
      // No maybeStartPlayback() here — audio.buffered isn't updated until
      // updateend fires. The SourceBuffer's updateend listener kicks playback.
    }
    this.streamEnded = true;
    this.drain();
  }

  private drain(): void {
    if (this.aborted) return;
    const sb = this.sourceBuffer;
    const ms = this.mediaSource;
    if (!sb || !ms) return;
    if (sb.updating || this.appending) return;

    if (this.pending.length > 0) {
      const chunk = this.pending.shift()!;
      this.appending = true;
      try {
        // Copy into a fresh ArrayBuffer. `chunk.buffer` would feed the
        // SourceBuffer the entire underlying buffer including bytes outside
        // our view (fetch streams sometimes back many chunks with one
        // ArrayBuffer). `new Uint8Array(chunk)` per spec copies into its own
        // fresh buffer, so `.buffer` is exactly our chunk's bytes.
        sb.appendBuffer(new Uint8Array(chunk).buffer);
      } catch (err) {
        this.appending = false;
        this.fail(err);
        return;
      }
      return;
    }

    if (this.streamEnded && ms.readyState === "open") {
      try {
        ms.endOfStream();
      } catch {
        // Some browsers throw if endOfStream is called concurrently; ignore.
      }
    }
  }

  private maybeStartPlayback(): void {
    if (!this.audio || this.playbackStarted) return;
    const buffered = this.audio.buffered;
    if (buffered.length === 0) return;
    const available = buffered.end(0) - (this.audio.currentTime || 0);
    if (available * 1000 >= this.warmupMs) {
      this.playbackStarted = true;
      this.audio.play().then(
        () => this.onPlaybackStarted?.(),
        (err) => this.fail(err)
      );
    }
  }

  private fail(err: unknown): void {
    if (this.aborted) return;
    this.aborted = true;
    this.onError?.(err);
    this.stop();
  }
}
