// Phase 4: Browser speechSynthesis fallback
import { LANGUAGE_META, resolveLanguage } from "./languages";

export interface FallbackHandle {
  cancel: () => void;
}

export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Pick an installed voice matching the language: exact BCP 47 tag first, then
 * any voice sharing the base subtag. Returns undefined when none match (or the
 * voice list hasn't loaded yet), leaving the choice to the browser via `lang`.
 */
function pickVoice(bcp47: string, base: string): SpeechSynthesisVoice | undefined {
  try {
    const voices = window.speechSynthesis.getVoices?.() ?? [];
    const norm = (v: string) => v.replace(/_/g, "-").toLowerCase();
    const want = norm(bcp47);
    return (
      voices.find((v) => norm(v.lang) === want) ??
      voices.find((v) => norm(v.lang).split("-")[0] === base)
    );
  } catch {
    return undefined;
  }
}

export function speakFallback(
  text: string,
  onEnd?: () => void,
  onError?: () => void,
  lang?: string,
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

    const resolved = resolveLanguage(lang);
    if (resolved) {
      const meta = LANGUAGE_META[resolved];
      utterance.lang = meta.bcp47;
      const voice = pickVoice(meta.bcp47, meta.base);
      if (voice) utterance.voice = voice;
    }

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
