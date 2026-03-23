// Global audio coordinator — ensures only one TTS instance plays at a time

type StopCallback = () => void;

let currentId: string | null = null;
let currentStop: StopCallback | null = null;
let idCounter = 0;

export function generateInstanceId(): string {
  return `tts2go_${++idCounter}`;
}

export function acquireAudioLock(id: string, stopFn: StopCallback): void {
  if (currentId && currentId !== id && currentStop) {
    try {
      currentStop();
    } catch {
      // Never let a stop error prevent the new instance from playing
    }
  }
  currentId = id;
  currentStop = stopFn;
}

export function releaseAudioLock(id: string): void {
  if (currentId === id) {
    currentId = null;
    currentStop = null;
  }
}
