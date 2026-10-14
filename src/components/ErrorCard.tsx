"use client";

import type { UiStrings } from "@/lib/i18n";

export function ErrorCard({
  message,
  onRetry,
  strings,
}: {
  message: string;
  onRetry: () => void;
  strings: UiStrings;
}) {
  return (
    <div
      role="alert"
      className="w-full max-w-md rounded-2xl border border-warning/30 bg-warning/5 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-warning"
        >
          <path
            fillRule="evenodd"
            d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 1.999-.29 4.499-2.599 4.499H4.645c-2.309 0-3.752-2.5-2.598-4.499L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z"
            clipRule="evenodd"
          />
        </svg>

        <div className="flex-1">
          <p className="text-sm text-foreground">{message}</p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-transform active:scale-95"
          >
            {strings.errorGeneric.includes("try")
              ? "Try again"
              : strings.errorGeneric.includes("कोशिश")
                ? "फिर से कोशिश"
                : "पुन्हा प्रयत्न"}
          </button>
        </div>
      </div>
    </div>
  );
}
