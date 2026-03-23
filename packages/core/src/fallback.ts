// Phase 4: Browser speechSynthesis fallback

export interface FallbackHandle {
  cancel: () => void;
}

export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakFallback(
  text: string,
  onEnd?: () => void,
  onError?: () => void,
): FallbackHandle {
  let done = false;
  const safetyTimeout = setTimeout(() => {
    if (!done) {
      done = true;
      onEnd?.();
    }
  }, Math.max(3000, text.length * 80));

  if (!hasSpeechSynthesis()) {
    clearTimeout(safetyTimeout);
    done = true;
    onError?.();
    return { cancel: () => {} };
  }

  try {
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onend = () => {
      if (!done) {
        done = true;
        clearTimeout(safetyTimeout);
        onEnd?.();
      }
    };

    utterance.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(safetyTimeout);
        // Treat fallback errors as completion — never leave button stuck
        onEnd?.();
      }
    };

    window.speechSynthesis.speak(utterance);
  } catch {
    clearTimeout(safetyTimeout);
    if (!done) {
      done = true;
      // speechSynthesis threw — recover gracefully
      onEnd?.();
    }
  }

  return {
    cancel: () => {
      if (!done) {
        done = true;
        clearTimeout(safetyTimeout);
      }
      stopFallback();
    },
  };
}

export function stopFallback(): void {
  if (!hasSpeechSynthesis()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore — some browsers throw on cancel
  }
}
