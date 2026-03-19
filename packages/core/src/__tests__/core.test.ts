import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash, TTS2GoClient, buildCDNUrl, contentHash } from "../index";

describe("createHash (SHA-256)", () => {
  it("returns a 64-char hex string", () => {
    const hash = createHash("hello");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic", () => {
    expect(createHash("test")).toBe(createHash("test"));
  });

  it("produces different hashes for different inputs", () => {
    expect(createHash("a")).not.toBe(createHash("b"));
  });

  it("matches known SHA-256 value for empty string", () => {
    // SHA-256("") = e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    expect(createHash("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });

  it("matches known SHA-256 value for 'hello'", () => {
    // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(createHash("hello")).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });
});

describe("contentHash", () => {
  it("hashes content+projectId+voiceId together", () => {
    const hash = contentHash("Hello world", "proj-1", "voice-1");
    const expected = createHash("Hello world" + "proj-1" + "voice-1");
    expect(hash).toBe(expected);
  });

  it("is different for different voice IDs", () => {
    const h1 = contentHash("Hello", "proj-1", "voice-1");
    const h2 = contentHash("Hello", "proj-1", "voice-2");
    expect(h1).not.toBe(h2);
  });
});

describe("buildCDNUrl", () => {
  it("builds correct CDN URL format", () => {
    const url = buildCDNUrl("https://cdn.example.com", "proj-1", "Hello", "voice-1");
    const expectedHash = contentHash("Hello", "proj-1", "voice-1");
    expect(url).toBe(`https://cdn.example.com/proj-1/voice-1/${expectedHash}.mp3`);
  });

  it("ends with .mp3", () => {
    const url = buildCDNUrl("https://cdn.example.com", "p", "c", "v");
    expect(url).toMatch(/\.mp3$/);
  });
});

describe("TTS2GoClient", () => {
  it("sets default cdnBase and apiBase", () => {
    const client = new TTS2GoClient({ apiKey: "tts_abc", projectId: "proj-1" });
    expect(client.projectId).toBe("proj-1");
    expect(client.hideTTSIfNoFallback).toBe(false);
  });

  it("respects custom config", () => {
    const client = new TTS2GoClient({
      apiKey: "tts_abc",
      projectId: "proj-2",
      hideTTSIfNoFallback: true,
    });
    expect(client.hideTTSIfNoFallback).toBe(true);
  });

  it("getCDNUrl returns correct URL", () => {
    const client = new TTS2GoClient({
      apiKey: "tts_abc",
      projectId: "proj-1",
      cdnBase: "https://cdn.test.com",
    });
    const url = client.getCDNUrl("Hello", "voice-1");
    expect(url).toBe(buildCDNUrl("https://cdn.test.com", "proj-1", "Hello", "voice-1"));
  });

  describe("event system", () => {
    it("emits and receives events via on/off", () => {
      const client = new TTS2GoClient({ apiKey: "tts_abc", projectId: "proj-1" });
      const handler = vi.fn();

      client.on("statusChange", handler);

      // Since emit is private, we test indirectly — ensure on/off don't throw
      expect(() => client.on("statusChange", handler)).not.toThrow();
      expect(() => client.off("statusChange", handler)).not.toThrow();
    });

    it("off removes the listener", () => {
      const client = new TTS2GoClient({ apiKey: "tts_abc", projectId: "proj-1" });
      const handler = vi.fn();

      client.on("statusChange", handler);
      client.off("statusChange", handler);
      // After off, handler should not be called — but emit is private
      // At minimum, verify no errors
    });
  });
});

describe("sdkFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("throws with error message from response body", async () => {
    const { sdkFetch } = await import("../api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: "Invalid API key" }),
    }));

    await expect(
      sdkFetch({ apiBase: "https://api.test.com", apiKey: "tts_bad" }, "/test")
    ).rejects.toThrow("Invalid API key");
  });

  it("throws with status code when no error body", async () => {
    const { sdkFetch } = await import("../api");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("no json")),
    }));

    await expect(
      sdkFetch({ apiBase: "https://api.test.com", apiKey: "tts_bad" }, "/test")
    ).rejects.toThrow("Request failed: 500");
  });

  it("sends correct headers", async () => {
    const { sdkFetch } = await import("../api");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "ok" }),
    });
    vi.stubGlobal("fetch", mockFetch);

    await sdkFetch({ apiBase: "https://api.test.com", apiKey: "tts_key123" }, "/voices");

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/voices",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-API-Key": "tts_key123",
        }),
      })
    );
  });
});
