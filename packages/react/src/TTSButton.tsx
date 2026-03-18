"use client";
import type { CSSProperties } from "react";
import { useTTS } from "./useTTS";
import { useTTS2GoContext } from "./TTS2GoProvider";

export interface TTSButtonProps {
  content: string;
  voiceId: string;
  className?: string;
  size?: number;
}

const baseStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 4,
  borderRadius: 4,
  transition: "opacity 0.2s",
};

// Speaker icon (idle)
function SpeakerIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}

// Loading spinner
function LoadingIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" opacity="1">
        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

// Playing animation (sound waves)
function PlayingIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="10" width="3" height="4" rx="1">
        <animate attributeName="height" values="4;14;4" dur="0.8s" repeatCount="indefinite" />
        <animate attributeName="y" values="10;5;10" dur="0.8s" repeatCount="indefinite" />
      </rect>
      <rect x="10" y="8" width="3" height="8" rx="1">
        <animate attributeName="height" values="8;4;8" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
        <animate attributeName="y" values="8;10;8" dur="0.8s" repeatCount="indefinite" begin="0.2s" />
      </rect>
      <rect x="16" y="6" width="3" height="12" rx="1">
        <animate attributeName="height" values="12;6;12" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
        <animate attributeName="y" values="6;9;6" dur="0.8s" repeatCount="indefinite" begin="0.4s" />
      </rect>
    </svg>
  );
}

// Pause icon
function PauseIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

// Error icon
function ErrorIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}

function getIcon(status: string, size: number) {
  switch (status) {
    case "loading":
      return <LoadingIcon size={size} />;
    case "playing":
    case "fallback":
      return <PlayingIcon size={size} />;
    case "paused":
      return <PauseIcon size={size} />;
    case "error":
      return <ErrorIcon size={size} />;
    default:
      return <SpeakerIcon size={size} />;
  }
}

function getAriaLabel(status: string): string {
  switch (status) {
    case "loading":
      return "Loading audio...";
    case "playing":
    case "fallback":
      return "Stop audio";
    case "paused":
      return "Resume audio";
    case "error":
      return "Audio error, click to retry";
    default:
      return "Play audio";
  }
}

export function TTSButton({ content, voiceId, className, size = 24 }: TTSButtonProps) {
  const { client, browserTTSSupported } = useTTS2GoContext();
  const { status, play, stop, pause } = useTTS(content, voiceId);

  if (client.hideTTSIfNoFallback && !browserTTSSupported) {
    return null;
  }

  function handleClick() {
    switch (status) {
      case "playing":
      case "fallback":
        stop();
        break;
      case "paused":
        play();
        break;
      case "loading":
        // Do nothing while loading
        break;
      default:
        play();
        break;
    }
  }

  return (
    <button
      type="button"
      role="button"
      className={className}
      style={baseStyle}
      onClick={handleClick}
      aria-label={getAriaLabel(status)}
      disabled={status === "loading"}
      title={getAriaLabel(status)}
    >
      {getIcon(status, size)}
    </button>
  );
}
