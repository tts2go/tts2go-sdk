// Phase 4: Browser speechSynthesis fallback
export function hasSpeechSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakFallback(text: string): void {
  if (!hasSpeechSynthesis()) return;
  const utterance = new SpeechSynthesisUtterance(text);
  window.speechSynthesis.speak(utterance);
}

export function stopFallback(): void {
  if (!hasSpeechSynthesis()) return;
  window.speechSynthesis.cancel();
}
