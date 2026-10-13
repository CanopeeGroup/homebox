type ImportJob = { status: string };

/** Follow a restore through navigation even if its WebSocket event is lost. */
export function watchImportCompletion(options: {
  getJob: () => Promise<{ data?: ImportJob | null; error?: unknown }>;
  isCurrent: () => boolean;
  onCompleted: () => Promise<void>;
  onStopped: () => void;
}) {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function stop() {
    if (stopped) return;
    stopped = true;
    clearTimeout(timer);
    options.onStopped();
  }

  async function poll() {
    if (stopped || !options.isCurrent()) return stop();
    try {
      const result = await options.getJob();
      if (stopped || !options.isCurrent()) return stop();
      if (!result.error && result.data?.status === "completed") {
        try {
          await options.onCompleted();
        } finally {
          stop();
        }
        return;
      }
      if (!result.error && result.data?.status === "failed") return stop();
    } catch (error) {
      // Network errors are temporary; polling resumes without a page reload.
      console.error("Import completion check failed", error);
    }
    if (!stopped) timer = setTimeout(() => void poll(), 2000);
  }

  // Defer the first request so the owner can register the cancellation handle.
  timer = setTimeout(() => void poll(), 0);
  return stop;
}
