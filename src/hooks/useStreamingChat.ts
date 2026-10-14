"use client";

import { useCallback, useRef, useState } from "react";
import { extractNextSentence } from "@/lib/sentenceSplitter";
import { playFiller } from "@/lib/fillerAudio";
import type { AppLanguage } from "@/lib/sarvam/config";
import type { ChatRequest } from "@/lib/types";

interface StreamingChatParams extends Omit<ChatRequest, "question"> {
  question: string;
  language: AppLanguage;
}

interface UseStreamingChatReturn {
  isStreaming: boolean;
  isSpeaking: boolean;
  startStream: (params: StreamingChatParams) => Promise<void>;
  abort: () => void;
}

/** Fetches TTS audio URL for a given sentence */
async function fetchTTSAudio(
  text: string,
  language: AppLanguage,
  signal: AbortSignal
): Promise<string | null> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { audioUrl?: string };
    return data.audioUrl ?? null;
  } catch {
    return null;
  }
}

/** Plays an audio URL; resolves when playback ends or is aborted */
function playAudioUrl(url: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);

    const cleanup = () => {
      audio.onended = null;
      audio.onerror = null;
      resolve();
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;

    signal.addEventListener(
      "abort",
      () => {
        audio.pause();
        audio.src = "";
        cleanup();
      },
      { once: true }
    );

    audio.play().catch(cleanup);
  });
}

export function useStreamingChat(): UseStreamingChatReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
    setIsSpeaking(false);
  }, []);

  const startStream = useCallback(
    async (params: StreamingChatParams) => {
      // Cancel any existing stream
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;

      setIsStreaming(true);
      setIsSpeaking(false);

      // Strictly ordered audio playback chain
      let playChain: Promise<void> = Promise.resolve();
      let pendingSentences = 0;
      let streamDone = false;

      function enqueueAudio(url: string) {
        pendingSentences++;
        playChain = playChain.then(async () => {
          if (ac.signal.aborted) return;
          setIsSpeaking(true);
          await playAudioUrl(url, ac.signal);
          pendingSentences--;
          if (pendingSentences === 0 && streamDone) {
            setIsSpeaking(false);
          }
        });
      }

      // Filler: play after 700ms of reasoning_started with no content
      let fillerStop: (() => void) | null = null;
      const fillerTimer = setTimeout(() => {
        if (!ac.signal.aborted) {
          fillerStop = playFiller(params.language);
        }
      }, 700);

      let firstContent = false;

      function stopFiller() {
        clearTimeout(fillerTimer);
        if (fillerStop) {
          fillerStop();
          fillerStop = null;
        }
      }

      // TTS sentence pipeline
      const ttsPending: Promise<void>[] = [];
      let textBuffer = "";

      async function speakSentence(sentence: string): Promise<void> {
        if (!sentence.trim() || ac.signal.aborted) return;
        const audioUrl = await fetchTTSAudio(sentence, params.language, ac.signal);
        if (audioUrl && !ac.signal.aborted) {
          enqueueAudio(audioUrl);
        }
      }

      function drainBuffer(flush = false) {
        if (flush && textBuffer.trim()) {
          const remaining = textBuffer.trim();
          textBuffer = "";
          ttsPending.push(speakSentence(remaining));
          return;
        }
        let result = extractNextSentence(textBuffer);
        while (result) {
          const { sentence, remainder } = result;
          textBuffer = remainder;
          ttsPending.push(speakSentence(sentence));
          result = extractNextSentence(textBuffer);
        }
      }

      try {
        const chatBody: ChatRequest = {
          ocrText: params.ocrText,
          summary: params.summary,
          language: params.language,
          history: params.history,
          question: params.question,
        };

        const res = await fetch("/api/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(chatBody),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          stopFiller();
          setIsStreaming(false);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let currentEvent = "";

        outer: while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (ac.signal.aborted) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split("\n");
          sseBuffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();

            if (!trimmed) {
              // Empty line resets current event
              currentEvent = "";
              continue;
            }

            if (trimmed.startsWith("event:")) {
              currentEvent = trimmed.slice(6).trim();
              continue;
            }

            if (trimmed.startsWith("data:")) {
              const dataStr = trimmed.slice(5).trim();
              try {
                const payload = JSON.parse(dataStr) as Record<string, unknown>;

                switch (currentEvent) {
                  case "content_delta": {
                    if (!firstContent) {
                      firstContent = true;
                      stopFiller();
                    }
                    const delta = (payload as { delta?: string }).delta ?? "";
                    textBuffer += delta;
                    drainBuffer();
                    break;
                  }

                  case "done": {
                    drainBuffer(true);
                    break outer;
                  }

                  case "error": {
                    const msg =
                      (payload as { message?: string }).message ??
                      "Error in streaming response";
                    console.error("[useStreamingChat] stream error:", msg);
                    stopFiller();
                    // Speak fallback message
                    const fallbackUrl = await fetchTTSAudio(
                      "Sorry, I could not get an answer. Please try again.",
                      params.language,
                      ac.signal
                    );
                    if (fallbackUrl && !ac.signal.aborted) {
                      enqueueAudio(fallbackUrl);
                    }
                    break outer;
                  }
                }
              } catch {
                // ignore parse errors in SSE data
              }
            }
          }
        }

        // Wait for all TTS fetches then all audio playback
        await Promise.all(ttsPending);
        streamDone = true;
        if (pendingSentences === 0) {
          setIsSpeaking(false);
        }
        await playChain;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // User aborted — silent
        } else {
          console.error("[useStreamingChat] error:", err);
        }
      } finally {
        stopFiller();
        setIsStreaming(false);
        if (!ac.signal.aborted) {
          setIsSpeaking(false);
        }
      }
    },
    []
  );

  return { isStreaming, isSpeaking, startStream, abort };
}
