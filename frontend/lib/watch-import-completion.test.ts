import { afterEach, describe, expect, it, vi } from "vitest";
import { watchImportCompletion } from "./watch-import-completion";

afterEach(() => vi.useRealTimers());

describe("restore completion without WebSocket delivery", () => {
  it("waits for completion and refreshes exactly once", async () => {
    vi.useFakeTimers();
    const getJob = vi
      .fn()
      .mockResolvedValueOnce({ data: { status: "running" } })
      .mockResolvedValue({ data: { status: "completed" } });
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    const onStopped = vi.fn();
    watchImportCompletion({ getJob, isCurrent: () => true, onCompleted, onStopped });
    await vi.advanceTimersByTimeAsync(0);
    expect(onCompleted).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000);
    expect(onCompleted).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(10000);
    expect(getJob).toHaveBeenCalledTimes(2);
    expect(onStopped).toHaveBeenCalledOnce();
  });

  it("retries a temporary API error", async () => {
    vi.useFakeTimers();
    const getJob = vi
      .fn()
      .mockResolvedValueOnce({ error: "offline" })
      .mockResolvedValue({ data: { status: "completed" } });
    const onCompleted = vi.fn().mockResolvedValue(undefined);
    watchImportCompletion({ getJob, isCurrent: () => true, onCompleted, onStopped: vi.fn() });
    await vi.advanceTimersByTimeAsync(2000);
    expect(onCompleted).toHaveBeenCalledOnce();
  });

  it("does not refresh another collection after navigation", async () => {
    vi.useFakeTimers();
    let current = true;
    const getJob = vi.fn().mockImplementation(async () => {
      current = false;
      return { data: { status: "completed" } };
    });
    const onCompleted = vi.fn();
    watchImportCompletion({ getJob, isCurrent: () => current, onCompleted, onStopped: vi.fn() });
    await vi.advanceTimersByTimeAsync(10000);
    expect(onCompleted).not.toHaveBeenCalled();
    expect(getJob).toHaveBeenCalledOnce();
  });

  it("stops after a failed restore", async () => {
    vi.useFakeTimers();
    const getJob = vi.fn().mockResolvedValue({ data: { status: "failed" } });
    const onCompleted = vi.fn();
    watchImportCompletion({ getJob, isCurrent: () => true, onCompleted, onStopped: vi.fn() });
    await vi.advanceTimersByTimeAsync(10000);
    expect(onCompleted).not.toHaveBeenCalled();
    expect(getJob).toHaveBeenCalledOnce();
  });
});
