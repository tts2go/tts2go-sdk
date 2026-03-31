import type { TTS2GoClient } from "@tts2go/core";
import { createTTSButton } from "./button";

const DEFAULT_SELECTOR =
  "p, h1, h2, h3, h4, h5, h6, li, blockquote, td, th, figcaption, dt, dd, caption, summary";

const SKIP_ANCESTORS = "nav, footer, header, script, style, noscript, [data-tts2go-ignore]";

const PROCESSED_ATTR = "data-tts2go";

export interface ScannerOptions {
  client: TTS2GoClient;
  voiceId: string;
  selector?: string;
  minLength?: number;
  size?: number;
}

function isHidden(el: HTMLElement): boolean {
  return el.offsetParent === null && el.tagName !== "BODY" && el.tagName !== "HTML";
}

function hasSkipAncestor(el: HTMLElement): boolean {
  return el.closest(SKIP_ANCESTORS) !== null;
}

function processElement(el: HTMLElement, opts: ScannerOptions): void {
  if (el.hasAttribute(PROCESSED_ATTR)) return;

  const text = (el.textContent || "").trim();
  if (text.length < (opts.minLength ?? 15)) return;
  if (isHidden(el)) return;
  if (hasSkipAncestor(el)) return;

  el.setAttribute(PROCESSED_ATTR, "");
  const btn = createTTSButton(opts.client, text, opts.voiceId, opts.size ?? 20);
  el.appendChild(btn);
}

export function scan(root: Element | Document, opts: ScannerOptions): void {
  const selector = opts.selector || DEFAULT_SELECTOR;
  const elements = root.querySelectorAll<HTMLElement>(selector);
  for (const el of elements) {
    processElement(el, opts);
  }
}

export function observe(opts: ScannerOptions): MutationObserver {
  let timer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver((mutations) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scan(node as Element, opts);
          }
        }
      }
    }, 300);
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
}
