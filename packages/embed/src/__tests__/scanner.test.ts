import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { TTS2GoClient } from "@tts2go/core";
import { scan, resolveElementLanguage } from "../scanner";

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe("resolveElementLanguage", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("lang");
    setBody("");
  });

  it("prefers data-tts-lang on the closest ancestor", () => {
    document.documentElement.lang = "en";
    setBody(`<section lang="fr" data-tts-lang="ja"><div lang="de"><p id="t">x</p></div></section>`);
    expect(resolveElementLanguage(document.getElementById("t")!)).toBe("ja");
  });

  it("data-tts-lang on the element itself wins", () => {
    setBody(`<div data-tts-lang="ja"><p id="t" data-tts-lang="ko">x</p></div>`);
    expect(resolveElementLanguage(document.getElementById("t")!)).toBe("ko");
  });

  it("falls back to the closest [lang] ancestor", () => {
    document.documentElement.lang = "en";
    setBody(`<article lang="es-MX"><p id="t">x</p></article>`);
    expect(resolveElementLanguage(document.getElementById("t")!)).toBe("es-MX");
  });

  it("falls back to <html lang>", () => {
    document.documentElement.lang = "pt-BR";
    setBody(`<p id="t">x</p>`);
    expect(resolveElementLanguage(document.getElementById("t")!)).toBe("pt-BR");
  });

  it("skips empty attributes", () => {
    document.documentElement.lang = "it";
    setBody(`<div data-tts-lang=""><div lang=""><p id="t">x</p></div></div>`);
    expect(resolveElementLanguage(document.getElementById("t")!)).toBe("it");
  });

  it("returns undefined when nothing is set (client default applies)", () => {
    setBody(`<p id="t">x</p>`);
    expect(resolveElementLanguage(document.getElementById("t")!)).toBeUndefined();
  });
});

describe("scan → click sends the element language", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  const originalOffsetParent = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetParent");

  beforeEach(() => {
    document.documentElement.lang = "en";
    // jsdom has no layout: make elements look visible to the scanner.
    Object.defineProperty(HTMLElement.prototype, "offsetParent", {
      configurable: true,
      get() {
        return this.parentNode;
      },
    });
    // Force a CDN miss so the button goes through handleMiss → /sdk/request.
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("miss"));
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ status: "queued" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalOffsetParent) Object.defineProperty(HTMLElement.prototype, "offsetParent", originalOffsetParent);
  });

  async function clickAndGetBody(p: HTMLElement): Promise<Record<string, unknown>> {
    const btn = p.querySelector<HTMLButtonElement>("button[data-tts2go-btn]")!;
    expect(btn).toBeTruthy();
    btn.click();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    return JSON.parse(init.body as string);
  }

  it("uses the closest lang attribute, overriding the script default", async () => {
    setBody(`<div lang="ja"><p id="t">これは十分に長い日本語のテキストです。</p></div>`);
    const client = new TTS2GoClient({ apiKey: "k", projectId: "p", apiBase: "https://api.test", language: "fr" });
    scan(document, { client, voiceId: "v", minLength: 5 });
    const body = await clickAndGetBody(document.getElementById("t")!);
    expect(body.language).toBe("ja");
  });

  it("resolves the language at play time (picks up later lang changes)", async () => {
    setBody(`<div id="wrap" lang="de"><p id="t">Dies ist ein ausreichend langer Text.</p></div>`);
    const client = new TTS2GoClient({ apiKey: "k", projectId: "p", apiBase: "https://api.test" });
    scan(document, { client, voiceId: "v", minLength: 5 });
    document.getElementById("wrap")!.setAttribute("lang", "es-ES");
    const body = await clickAndGetBody(document.getElementById("t")!);
    expect(body.language).toBe("es-ES");
  });

  it("falls back to the client default when no lang is present", async () => {
    document.documentElement.removeAttribute("lang");
    setBody(`<p id="t">Ceci est un texte suffisamment long.</p>`);
    const client = new TTS2GoClient({ apiKey: "k", projectId: "p", apiBase: "https://api.test", language: "fr" });
    scan(document, { client, voiceId: "v", minLength: 5 });
    const body = await clickAndGetBody(document.getElementById("t")!);
    expect(body.language).toBe("fr");
  });

  it("sends no language when neither DOM nor config specify one", async () => {
    document.documentElement.removeAttribute("lang");
    setBody(`<p id="t">This is a sufficiently long sentence.</p>`);
    const client = new TTS2GoClient({ apiKey: "k", projectId: "p", apiBase: "https://api.test" });
    scan(document, { client, voiceId: "v", minLength: 5 });
    const body = await clickAndGetBody(document.getElementById("t")!);
    expect(body).not.toHaveProperty("language");
  });
});
