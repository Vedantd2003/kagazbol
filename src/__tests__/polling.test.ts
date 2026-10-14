import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { waitForParseCompletion, PollingTimeoutError } from "@/lib/apiClient";

// waitForParseCompletion → getParseStatus → fetch("/api/parse/status?...")
// We mock global fetch so the internal call is intercepted regardless of
// how the module binds it.

function makeStatusResponse(state: string, errorMessage?: string) {
  return new Response(JSON.stringify({ state, errorMessage }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("waitForParseCompletion", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("resolves immediately when job is already Completed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeStatusResponse("Completed")));
    await expect(waitForParseCompletion("job-1")).resolves.toBeUndefined();
  });

  it("resolves on PartiallyCompleted", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeStatusResponse("PartiallyCompleted")));
    await expect(waitForParseCompletion("job-2")).resolves.toBeUndefined();
  });

  it("throws with the API error message on Failed state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(makeStatusResponse("Failed", "OCR service unavailable"))
    );
    await expect(waitForParseCompletion("job-3")).rejects.toThrow("OCR service unavailable");
  });

  it("polls until Completed, calling onPoll each time", async () => {
    const states = ["Pending", "Running", "Running", "Completed"];
    let call = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() => Promise.resolve(makeStatusResponse(states[call++])))
    );

    const onPoll = vi.fn();
    const promise = waitForParseCompletion("job-4", { onPoll });

    // Drain all pending timers/microtasks for each polling iteration.
    for (let i = 0; i < 4; i++) {
      await vi.runAllTimersAsync();
    }

    await promise;
    expect(onPoll).toHaveBeenCalledTimes(4);
    expect(onPoll).toHaveBeenLastCalledWith("Completed");
  });

  it("throws PollingTimeoutError when the time budget is exceeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeStatusResponse("Running")));

    const promise = waitForParseCompletion("job-5", { timeoutMs: 100 });
    // Attach the rejection handler BEFORE advancing timers to prevent the
    // "unhandled rejection" warning that Vitest emits when the timer fires
    // the rejection before the expect chain is attached.
    const assertion = expect(promise).rejects.toBeInstanceOf(PollingTimeoutError);
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });

  it("throws AbortError when signal is aborted during a backoff wait", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeStatusResponse("Running")));

    const ac = new AbortController();
    const promise = waitForParseCompletion("job-6", { signal: ac.signal, timeoutMs: 30_000 });
    const assertion = expect(promise).rejects.toMatchObject({ name: "AbortError" });

    // First poll completes (Running), then the backoff wait begins.
    // Abort the signal mid-wait.
    ac.abort();
    await vi.runAllTimersAsync();
    await assertion;
  });

  it("throws AbortError immediately when signal is already aborted before polling starts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeStatusResponse("Running")));

    const ac = new AbortController();
    ac.abort();

    await expect(waitForParseCompletion("job-7", { signal: ac.signal })).rejects.toMatchObject({
      name: "AbortError",
    });
  });
});
