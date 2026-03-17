import type { TTS2GoClient, TTSStatus } from "@tts2go/core";
import { createTTS } from "./tts";

export interface TTSButtonOptions {
  client: TTS2GoClient;
  content: string;
  voiceId: string;
  className?: string;
  size?: number;
  target: HTMLElement;
}

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag: string, attrs: Record<string, string> = {}, children: Element[] = []): Element {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const child of children) el.appendChild(child);
  return el;
}

function renderIcon(status: TTSStatus, size: number): Element {
  const s = String(size);
  const base = { width: s, height: s, viewBox: "0 0 24 24" };

  if (status === "idle") {
    return svgEl("svg", { ...base, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
      svgEl("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
      svgEl("path", { d: "M15.54 8.46a5 5 0 0 1 0 7.07" }),
      svgEl("path", { d: "M19.07 4.93a10 10 0 0 1 0 14.14" }),
    ]);
  }

  if (status === "loading") {
    return svgEl("svg", { ...base, fill: "none", stroke: "currentColor", "stroke-width": "2" }, [
      svgEl("circle", { cx: "12", cy: "12", r: "10", opacity: "0.25" }),
      svgEl("path", { d: "M12 2a10 10 0 0 1 10 10", opacity: "1" }, [
        svgEl("animateTransform", { attributeName: "transform", type: "rotate", from: "0 12 12", to: "360 12 12", dur: "1s", repeatCount: "indefinite" }),
      ]),
    ]);
  }

  if (status === "playing" || status === "fallback") {
    return svgEl("svg", { ...base, fill: "currentColor" }, [
      svgEl("rect", { x: "4", y: "10", width: "3", height: "4", rx: "1" }, [
        svgEl("animate", { attributeName: "height", values: "4;14;4", dur: "0.8s", repeatCount: "indefinite" }),
        svgEl("animate", { attributeName: "y", values: "10;5;10", dur: "0.8s", repeatCount: "indefinite" }),
      ]),
      svgEl("rect", { x: "10", y: "8", width: "3", height: "8", rx: "1" }, [
        svgEl("animate", { attributeName: "height", values: "8;4;8", dur: "0.8s", repeatCount: "indefinite", begin: "0.2s" }),
        svgEl("animate", { attributeName: "y", values: "8;10;8", dur: "0.8s", repeatCount: "indefinite", begin: "0.2s" }),
      ]),
      svgEl("rect", { x: "16", y: "6", width: "3", height: "12", rx: "1" }, [
        svgEl("animate", { attributeName: "height", values: "12;6;12", dur: "0.8s", repeatCount: "indefinite", begin: "0.4s" }),
        svgEl("animate", { attributeName: "y", values: "6;9;6", dur: "0.8s", repeatCount: "indefinite", begin: "0.4s" }),
      ]),
    ]);
  }

  if (status === "paused") {
    return svgEl("svg", { ...base, fill: "currentColor" }, [
      svgEl("rect", { x: "6", y: "4", width: "4", height: "16", rx: "1" }),
      svgEl("rect", { x: "14", y: "4", width: "4", height: "16", rx: "1" }),
    ]);
  }

  // Error state
  return svgEl("svg", { ...base, fill: "none", stroke: "currentColor", "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, [
    svgEl("polygon", { points: "11 5 6 9 2 9 2 15 6 15 11 19 11 5" }),
    svgEl("line", { x1: "23", y1: "9", x2: "17", y2: "15" }),
    svgEl("line", { x1: "17", y1: "9", x2: "23", y2: "15" }),
  ]);
}

function getAriaLabel(status: TTSStatus): string {
  switch (status) {
    case "loading": return "Loading audio...";
    case "playing":
    case "fallback": return "Stop audio";
    case "paused": return "Resume audio";
    case "error": return "Audio error, click to retry";
    default: return "Play audio";
  }
}

export function createTTSButton(options: TTSButtonOptions): { destroy: () => void } {
  const { client, content, voiceId, className, size = 24, target } = options;
  const tts = createTTS(client, content, voiceId);

  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "button");
  if (className) button.className = className;
  Object.assign(button.style, {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "4px",
    transition: "opacity 0.2s",
  });

  let currentStatus: TTSStatus = "idle";

  function update(status: TTSStatus) {
    currentStatus = status;
    button.innerHTML = "";
    button.appendChild(renderIcon(status, size));
    const label = getAriaLabel(status);
    button.setAttribute("aria-label", label);
    button.title = label;
    button.disabled = status === "loading";
  }

  update("idle");

  button.addEventListener("click", () => {
    switch (currentStatus) {
      case "playing":
      case "fallback":
        tts.stop();
        break;
      case "paused":
        tts.play();
        break;
      case "loading":
        break;
      default:
        tts.play();
        break;
    }
  });

  const unsubscribe = tts.status.subscribe((status) => {
    update(status);
  });

  target.appendChild(button);

  return {
    destroy() {
      unsubscribe();
      tts.destroy();
      button.remove();
    },
  };
}
