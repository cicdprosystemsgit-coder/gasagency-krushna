"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const SOUND_STORAGE_KEY = "ga_notification_sound";

type AudioContextConstructor = typeof AudioContext;

function getAudioContextClass(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextConstructor })
      .webkitAudioContext ||
    null
  );
}

/**
 * Plays a pleasant WhatsApp-style two-tone chime using the Web Audio API
 * (no external MP3/WAV file needed) and persists mute preference in localStorage.
 */
export function useNotificationSound() {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Sync mute state from localStorage and listen for cross-component updates
  useEffect(() => {
    const syncMute = () => {
      try {
        setIsMuted(localStorage.getItem(SOUND_STORAGE_KEY) === "false");
      } catch {
        setIsMuted(false);
      }
    };
    syncMute();
    window.addEventListener("ga:sound-setting-changed", syncMute);
    return () => window.removeEventListener("ga:sound-setting-changed", syncMute);
  }, []);

  // Unlock AudioContext on first user interaction so background polling can play sound
  useEffect(() => {
    const unlock = () => {
      try {
        const AudioCtx = getAudioContextClass();
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
      } catch {
        // Ignore audio unlock errors
      }
    };

    window.addEventListener("pointerdown", unlock, { passive: true });
    window.addEventListener("keydown", unlock, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const play = useCallback((force = false) => {
    if (typeof window === "undefined") return;
    if (!force && localStorage.getItem(SOUND_STORAGE_KEY) === "false") return;

    // Subtle haptic vibration on mobile devices
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([70, 40, 70]);
      }
    } catch {
      // Ignore vibration errors
    }

    try {
      const AudioCtx = getAudioContextClass();
      if (!AudioCtx) return;

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      // Two-note chime: A5 (880Hz) -> D6 (1174.66Hz)
      const notes = [
        { freq: 880, start: 0, duration: 0.14, peak: 0.22 },
        { freq: 1174.66, start: 0.1, duration: 0.28, peak: 0.26 },
      ];

      for (const note of notes) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(note.freq, now + note.start);

        gain.gain.setValueAtTime(0.001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(
          note.peak,
          now + note.start + 0.02
        );
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          now + note.start + note.duration
        );

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + note.start);
        osc.stop(now + note.start + note.duration + 0.02);
      }
    } catch {
      // Silently ignore if Web Audio is blocked
    }
  }, []);

  const toggleMute = useCallback(() => {
    try {
      const currentlyMuted = localStorage.getItem(SOUND_STORAGE_KEY) === "false";
      const nextMuted = !currentlyMuted;
      localStorage.setItem(SOUND_STORAGE_KEY, nextMuted ? "false" : "true");
      setIsMuted(nextMuted);
      window.dispatchEvent(new Event("ga:sound-setting-changed"));
      if (!nextMuted) {
        // Play a preview chime when turning sound ON
        play(true);
      }
    } catch {
      // Ignore storage errors
    }
  }, [play]);

  return { play, isMuted, toggleMute };
}

