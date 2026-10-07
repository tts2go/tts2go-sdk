import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import languagesJson from "../../languages.json";
import {
  SUPPORTED_LANGUAGES,
  LANGUAGE_META,
  resolveLanguage,
  isSupportedLanguage,
  TTS2GoClient,
  handleMiss,
  speakFallback,
  contentHash,
} from "../index";
import { _resetLanguageWarnings } from "../client";

function mockFetchJSON() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    new Response(JSON.stringify({ id: "req-1", status: "queued" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  );
}

function sentBody(fetchMock: ReturnType<typeof mockFetchJSON>, call = 0): string {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return init.body as string;
}

function makeClient(language?: string) {
  return new TTS2GoClient({
    apiKey: "tts_key",
    projectId: "proj-1",
    apiBase: "https://api.test.com",
    ...(language !== undefined ? { language } : {}),
  });
}

describe("languages.json ↔ SUPPORTED_LANGUAGES parity", () => {
  it("has the same codes in the same order", () => {
    expect(languagesJson.languages.map((l) => l.code)).toEqual([...SUPPORTED_LANGUAGES]);
  });

  it("LANGUAGE_META matches the JSON for every code", () => {
    expect(Object.keys(LANGUAGE_META).sort()).toEqual([...SUPPORTED_LANGUAGES].sort());
    for (const l of languagesJson.languages) {
      const meta = LANGUAGE_META[l.code as keyof typeof LANGUAGE_META];
      expect(meta, l.code).toBeDefined();
      expect({ base: meta.base, name: meta.name, nativeName: meta.nativeName, dir: meta.dir }).toEqual({
        base: l.base,
        name: l.name,
        nativeName: l.nativeName,
        dir: l.dir,
      });
    }
  });

  it("every base is itself a supported code", () => {
    for (const code of SUPPORTED_LANGUAGES) {
      expect(isSupportedLanguage(LANGUAGE_META[code].base)).toBe(true);
    }
  });
});

describe("resolveLanguage", () => {
  it.each([
    ["en", "en"],
    ["EN", "en"],
    ["en-US", "en"],
    ["en_GB", "en"],
    ["pt-BR", "pt-BR"],
    ["PT_br", "pt-BR"],
    ["pt-br", "pt-BR"],
    ["pt-AO", "pt"],
    ["es-mx", "es-MX"],
    ["es-AR", "es"],
    ["ar-sa", "ar-SA"],
    ["ar-MA", "ar"],
    ["zh-Hant-TW", "zh"],
    ["zh-CN", "zh"],
    ["ja-JP", "ja"],
    ["  fr  ", "fr"],
  ])("%s → %s", (input, expected) => {
    expect(resolveLanguage(input)).toBe(expected);
  });

  it.each([["xx"], ["nl"], ["bn"], [""], ["-"], ["english"]])("%s → undefined", (input) => {
    expect(resolveLanguage(input)).toBeUndefined();
  });

  it("handles null/undefined", () => {
    expect(resolveLanguage(undefined)).toBeUndefined();
    expect(resolveLanguage(null)).toBeUndefined();
    expect(resolveLanguage()).toBeUndefined();
  });
});

describe("TTS2GoClient language handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    _resetLanguageWarnings();
  });

  it("omits language from the body when unset (byte-identical to the legacy body)", async () => {
    const f = mockFetchJSON();
    const client = makeClient();
    await client.request("Hello", "voice-1");
    await client.requestOrStream("Hello", "voice-1");
    const legacy = JSON.stringify({ content: "Hello", voice_id: "voice-1" });
    expect(sentBody(f, 0)).toBe(legacy);
    expect(sentBody(f, 1)).toBe(legacy);
  });

  it("applies the config default", async () => {
    const f = mockFetchJSON();
    const client = makeClient("ja");
    await client.request("こんにちは", "voice-1");
    await client.requestOrStream("こんにちは", "voice-1");
    expect(JSON.parse(sentBody(f, 0))).toEqual({ content: "こんにちは", voice_id: "voice-1", language: "ja" });
    expect(JSON.parse(sentBody(f, 1)).language).toBe("ja");
  });

  it("canonicalizes the config default", async () => {
    const f = mockFetchJSON();
    await makeClient("pt_br").request("Olá", "v");
    expect(JSON.parse(sentBody(f)).language).toBe("pt-BR");
  });

  it("per-call option overrides the config default", async () => {
    const f = mockFetchJSON();
    const client = makeClient("ja");
    await client.request("Hola", "voice-1", { language: "es-MX" });
    await client.requestOrStream("Hola", "voice-1", { language: "de-AT" });
    expect(JSON.parse(sentBody(f, 0)).language).toBe("es-MX");
    expect(JSON.parse(sentBody(f, 1)).language).toBe("de");
  });

  it("an empty per-call language falls back to the config default", async () => {
    const f = mockFetchJSON();
    await makeClient("fr").request("Bonjour", "v", { language: "" });
    expect(JSON.parse(sentBody(f)).language).toBe("fr");
  });

  it("omits an unsupported language and warns once per value", async () => {
    const f = mockFetchJSON();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = makeClient();
    await client.request("Hallo", "v", { language: "nl" });
    await client.request("Hallo", "v", { language: "nl" });
    await client.requestOrStream("Hallo", "v", { language: "nl" });
    await client.request("Hallo", "v", { language: "xx" });

    const legacy = JSON.stringify({ content: "Hallo", voice_id: "v" });
    for (let i = 0; i < 4; i++) expect(sentBody(f, i)).toBe(legacy);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[0][0]).toContain('"nl"');
    expect(warn.mock.calls[1][0]).toContain('"xx"');
  });

  it("exposes the resolved default via client.language", () => {
    expect(makeClient("en-US").language).toBe("en");
    expect(makeClient().language).toBeUndefined();
  });

  it("language never affects the hash / CDN URL", () => {
    const plain = makeClient();
    const ja = makeClient("ja");
    const ar = makeClient("ar-SA");
    const url = plain.getCDNUrl("第3章", "voice-1");
    expect(ja.getCDNUrl("第3章", "voice-1")).toBe(url);
    expect(ar.getCDNUrl("第3章", "voice-1")).toBe(url);
    expect(url).toContain(contentHash("第3章", "proj-1", "voice-1"));
  });

  it("check() HEADs the same URL regardless of language", async () => {
    const f = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    await makeClient().check("Hello", "v");
    await makeClient("ko").check("Hello", "v");
    expect(f.mock.calls[0][0]).toBe(f.mock.calls[1][0]);
  });
});

describe("speakFallback language", () => {
  let utterances: Array<{ text: string; lang: string; voice: unknown }>;
  let voices: Array<{ lang: string; name: string }>;

  beforeEach(() => {
    utterances = [];
    voices = [];
    class FakeUtterance {
      text: string;
      lang = "";
      voice: unknown = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
        utterances.push(this);
      }
    }
    const speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: () => voices,
    };
    vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
    vi.stubGlobal("window", { speechSynthesis });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sets utterance.lang from LANGUAGE_META bcp47", () => {
    const h = speakFallback("你好", undefined, undefined, "zh");
    expect(utterances[0].lang).toBe("zh-CN");
    h.cancel();
  });

  it("resolves loose input (pt_br → pt-BR)", () => {
    speakFallback("Olá", undefined, undefined, "pt_br").cancel();
    expect(utterances[0].lang).toBe("pt-BR");
  });

  it("leaves lang untouched when no/unsupported language", () => {
    speakFallback("Hello").cancel();
    speakFallback("Hallo", undefined, undefined, "nl").cancel();
    expect(utterances[0].lang).toBe("");
    expect(utterances[1].lang).toBe("");
  });

  it("picks an exact-match voice, else a base-language voice", () => {
    voices = [
      { lang: "en-US", name: "Alex" },
      { lang: "es-ES", name: "Monica" },
      { lang: "es-MX", name: "Paulina" },
    ];
    speakFallback("Hola", undefined, undefined, "es-MX").cancel();
    speakFallback("Hola", undefined, undefined, "es").cancel();
    expect((utterances[0].voice as { name: string }).name).toBe("Paulina");
    expect((utterances[1].voice as { name: string }).name).toBe("Monica");
  });

  it("handleMiss threads language to the request and the fallback", async () => {
    vi.restoreAllMocks();
    const f = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ status: "queued" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    _resetLanguageWarnings();
    const client = makeClient("fr");
    const res = await handleMiss(client, "Hola", "v", {}, { language: "es" });
    expect(res.kind).toBe("fallback");
    const init = f.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(init.body as string).language).toBe("es");
    expect(utterances[0].lang).toBe("es");
    res.fallback?.cancel();
  });

  it("handleMiss uses the client default when no per-call language", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(JSON.stringify({ status: "queued" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const res = await handleMiss(makeClient("ar-EG"), "مرحبا", "v");
    expect(utterances[0].lang).toBe("ar-EG");
    res.fallback?.cancel();
  });
});
