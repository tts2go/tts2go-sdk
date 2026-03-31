const STYLES = `
.tts2go-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
  transition: opacity 0.2s;
  vertical-align: middle;
  margin-left: 4px;
  color: var(--tts2go-color, currentColor);
  opacity: 0.6;
}
.tts2go-btn:hover {
  opacity: 1;
}
.tts2go-btn:disabled {
  cursor: default;
  opacity: 0.3;
}
`;

let injected = false;

export function injectStyles(): void {
  if (injected) return;
  injected = true;
  const style = document.createElement("style");
  style.textContent = STYLES;
  document.head.appendChild(style);
}
