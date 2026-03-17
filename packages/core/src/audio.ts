export class AudioPlayer {
  private audio: HTMLAudioElement | null = null;

  onEnded?: () => void;
  onError?: (error: Event) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;

  async play(url: string): Promise<void> {
    this.stop();
    this.audio = new Audio(url);

    this.audio.addEventListener("ended", () => {
      this.onEnded?.();
    });

    this.audio.addEventListener("error", (e) => {
      this.onError?.(e);
    });

    this.audio.addEventListener("timeupdate", () => {
      if (this.audio) {
        this.onTimeUpdate?.(this.audio.currentTime, this.audio.duration);
      }
    });

    return this.audio.play();
  }

  pause(): void {
    this.audio?.pause();
  }

  resume(): void {
    if (this.audio && this.audio.paused) {
      this.audio.play();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.removeAttribute("src");
      this.audio = null;
    }
  }

  get isPlaying(): boolean {
    return this.audio !== null && !this.audio.paused;
  }

  get isPaused(): boolean {
    return this.audio !== null && this.audio.paused && this.audio.currentTime > 0;
  }

  get duration(): number {
    return this.audio?.duration ?? 0;
  }

  get currentTime(): number {
    return this.audio?.currentTime ?? 0;
  }
}
