import { TTS2Go } from "@tts2go/vanilla";

const VOICE_ID = "f0f3883e-1c23-484b-9149-7ae0b5e78b78";

const tts = new TTS2Go({
  apiKey: "tts_6eaea2b30538d0568124543533f7bb15401b5c1f9fa1d8ba6566df4f2c8644b7",
  projectId: "e6785bb8-a3d2-4fc9-bc01-57b77c295f66",
});

const sampleTexts = [
  "Welcome to TTS2Go! This is a text-to-speech demo powered by our Vanilla JS SDK.",
  "You can add speech to any text on your website with just a few lines of code.",
  "TTS2Go supports multiple voices and handles audio playback automatically.",
];

const app = document.getElementById("app");

app.innerHTML = `
  <div style="max-width: 640px; margin: 40px auto; font-family: system-ui, sans-serif;">
    <h1>TTS2Go Vanilla JS Example</h1>
    <section>
      <h2>TTS Instances with Custom Controls</h2>
      <div id="samples"></div>
    </section>
  </div>
`;

const samplesContainer = document.getElementById("samples");

sampleTexts.forEach((text, i) => {
  const instance = tts.create(text, VOICE_ID);

  const card = document.createElement("div");
  card.style.cssText =
    "border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px;";

  const paragraph = document.createElement("p");
  paragraph.style.margin = "0 0 12px";
  paragraph.textContent = text;

  const controls = document.createElement("div");
  controls.style.cssText = "display: flex; align-items: center; gap: 8px;";

  const playBtn = document.createElement("button");
  playBtn.style.cssText =
    "padding: 6px 16px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer;";
  playBtn.textContent = "Play";

  const pauseBtn = document.createElement("button");
  pauseBtn.style.cssText =
    "padding: 6px 16px; border-radius: 4px; border: 1px solid #ccc; cursor: pointer;";
  pauseBtn.textContent = "Pause";
  pauseBtn.disabled = true;

  const statusBadge = document.createElement("span");
  statusBadge.style.cssText =
    "display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; background: #e2e3e5;";
  statusBadge.textContent = "idle";

  playBtn.addEventListener("click", () => {
    const status = instance.getStatus();
    if (status === "playing" || status === "fallback") {
      instance.stop();
    } else {
      instance.play();
    }
  });

  pauseBtn.addEventListener("click", () => {
    instance.pause();
  });

  instance.onStatusChange = (status) => {
    statusBadge.textContent = status;
    statusBadge.style.background =
      status === "playing" ? "#d4edda" : status === "error" ? "#f8d7da" : "#e2e3e5";

    playBtn.textContent =
      status === "loading"
        ? "Loading..."
        : status === "playing" || status === "fallback"
          ? "Stop"
          : "Play";
    playBtn.disabled = status === "loading";
    pauseBtn.disabled = status !== "playing";
  };

  controls.append(playBtn, pauseBtn, statusBadge);
  card.append(paragraph, controls);
  samplesContainer.appendChild(card);
});
