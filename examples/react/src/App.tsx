import { TTSButton, useTTS } from "@tts2go/react";

const VOICE_ID = "f0f3883e-1c23-484b-9149-7ae0b5e78b78";

const sampleTexts = [
  "Welcome to TTS2Go! This is a text-to-speech demo powered by our React SDK.",
  "You can add speech to any text on your website with just a few lines of code.",
  "TTS2Go supports multiple voices and handles audio playback automatically.",
];

function CustomTTSControl({ text }: { text: string }) {
  const { status, play, stop, pause } = useTTS(text, VOICE_ID);

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <p style={{ margin: "0 0 12px" }}>{text}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={status === "playing" || status === "fallback" ? stop : play}
          disabled={status === "loading"}
          style={{ padding: "6px 16px", borderRadius: 4, border: "1px solid #ccc", cursor: "pointer" }}
        >
          {status === "loading" ? "Loading..." : status === "playing" || status === "fallback" ? "Stop" : "Play"}
        </button>
        <button
          onClick={pause}
          disabled={status !== "playing"}
          style={{ padding: "6px 16px", borderRadius: 4, border: "1px solid #ccc", cursor: "pointer" }}
        >
          Pause
        </button>
        <span
          style={{
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 12,
            background: status === "playing" ? "#d4edda" : status === "error" ? "#f8d7da" : "#e2e3e5",
          }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ maxWidth: 640, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>TTS2Go React Example</h1>

      <section style={{ marginBottom: 32 }}>
        <h2>Pre-built TTSButton</h2>
        <p>
          Click the speaker icon to hear this text read aloud.{" "}
          <TTSButton
            content="Click the speaker icon to hear this text read aloud."
            voiceId={VOICE_ID}
          />
        </p>
      </section>

      <section>
        <h2>Custom Controls with useTTS Hook</h2>
        {sampleTexts.map((text) => (
          <CustomTTSControl key={text} text={text} />
        ))}
      </section>
    </div>
  );
}
