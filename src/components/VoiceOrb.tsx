"use client";

import { motion } from "framer-motion";
import type { UiStrings } from "@/lib/i18n";

export type OrbState = "idle" | "listening" | "thinking" | "speaking" | "interrupted";

interface VoiceOrbProps {
  state: OrbState;
  micLevel?: number; // 0-1
  onPress?: () => void;
  onRelease?: () => void;
  isPushToTalk?: boolean;
  onTogglePushToTalk?: () => void;
  label?: string;
  strings?: Pick<UiStrings, "vadMode" | "pttMode">;
}

const STATE_COLORS: Record<OrbState, string> = {
  idle: "bg-primary",
  listening: "bg-primary",
  thinking: "bg-muted-foreground",
  speaking: "bg-primary",
  interrupted: "bg-warning",
};

const STATE_ARIA: Record<OrbState, string> = {
  idle: "Tap to speak",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking — tap to interrupt",
  interrupted: "Interrupted — listening",
};

export function VoiceOrb({
  state,
  micLevel = 0,
  onPress,
  onRelease,
  isPushToTalk = false,
  onTogglePushToTalk,
  label,
  strings,
}: VoiceOrbProps) {
  const ariaLabel = label ?? STATE_ARIA[state];
  const colorClass = STATE_COLORS[state];

  // Ring scale based on mic level when listening
  const ringScale = state === "listening" ? 1 + micLevel * 0.5 : 1;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Orb button — min 64×64px touch target */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        {/* Idle pulse ring */}
        {state === "idle" && (
          <span
            className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring"
            aria-hidden="true"
          />
        )}

        {/* Listening ring — expands with mic level */}
        {state === "listening" && (
          <motion.span
            className="absolute inset-0 rounded-full bg-primary/25"
            animate={{ scale: ringScale }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            aria-hidden="true"
          />
        )}

        {/* Thinking orbital pulse */}
        {state === "thinking" && (
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-muted-foreground/40"
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
          />
        )}

        {/* Interrupted — flash red */}
        {state === "interrupted" && (
          <motion.span
            className="absolute inset-0 rounded-full bg-warning/30"
            animate={{ opacity: [1, 0, 1, 0] }}
            transition={{ duration: 0.4, times: [0, 0.25, 0.5, 1] }}
            aria-hidden="true"
          />
        )}

        {/* Main orb button */}
        <motion.button
          type="button"
          onPointerDown={isPushToTalk ? onPress : onPress}
          onPointerUp={isPushToTalk ? onRelease : undefined}
          onPointerLeave={isPushToTalk ? onRelease : undefined}
          onClick={!isPushToTalk ? onPress : undefined}
          whileTap={{ scale: 0.9 }}
          aria-label={ariaLabel}
          className={`relative z-10 flex h-16 w-16 min-h-[64px] min-w-[64px] items-center justify-center rounded-full shadow-md transition-colors ${colorClass} text-primary-foreground`}
          style={{ touchAction: "manipulation" }}
        >
          {/* Speaking bars */}
          {state === "speaking" && (
            <div className="flex items-center gap-0.5" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <motion.span
                  key={i}
                  className="w-1 rounded-full bg-current"
                  animate={{ height: ["6px", "22px", "6px"] }}
                  transition={{
                    duration: 0.7,
                    repeat: Infinity,
                    delay: i * 0.12,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          )}

          {/* Thinking spinner */}
          {state === "thinking" && (
            <motion.span
              aria-hidden="true"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
              className="text-2xl"
            >
              ⟳
            </motion.span>
          )}

          {/* Mic icon for idle/listening/interrupted */}
          {(state === "idle" || state === "listening" || state === "interrupted") && (
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-7 w-7"
            >
              <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
              <path d="M19 10a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.93V19H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.07A7 7 0 0 0 19 10Z" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* State label */}
      {label !== undefined && (
        <p className="text-sm text-muted-foreground text-center">{label}</p>
      )}

      {/* Push-to-talk toggle */}
      {onTogglePushToTalk && strings && (
        <button
          type="button"
          onClick={onTogglePushToTalk}
          className="mt-1 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          aria-pressed={isPushToTalk}
        >
          {isPushToTalk ? strings.pttMode : strings.vadMode}
        </button>
      )}
    </div>
  );
}
