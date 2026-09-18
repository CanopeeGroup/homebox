/**
 * Nuxt plugin to initialize OpenTelemetry on the client side.
 * This ensures tracing is set up early in the application lifecycle.
 *
 * The plugin automatically enables telemetry when the backend has it enabled,
 * by querying the /api/v1/status endpoint.
 */

import { initializeOTel } from "~~/lib/otel";
import { usePublicApi } from "~~/composables/use-api";

// Timeout for the status API call to prevent blocking the app
const STATUS_API_TIMEOUT_MS = 3000;

/**
 * Fetch backend status with a timeout to prevent blocking app startup.
 */
async function fetchBackendTelemetryStatus(debug: boolean): Promise<boolean> {
  const api = usePublicApi();

  // Create a promise that rejects after timeout
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Status API timeout")), STATUS_API_TIMEOUT_MS);
  });

  try {
    // Race between the API call and the timeout
    const { data } = await Promise.race([api.status(), timeoutPromise]);
    const enabled = data?.telemetry?.enabled ?? false;

    if (debug) {
      console.log("[OTel] Backend telemetry status:", enabled);
    }
    return enabled;
  } catch (error) {
    if (debug) {
      console.warn("[OTel] Failed to fetch backend status:", error);
    }
    return false;
  }
}

export default defineNuxtPlugin(() => {
  const runtimeConfig = useRuntimeConfig();
  const otelDebug = String(runtimeConfig.public?.otelDebug || "false") === "true";

  // OpenTelemetry must never block application startup. Run the backend
  // capability check after Nuxt has mounted and initialize tracing in the
  // background only when the backend explicitly enables it.
  onNuxtReady(() => {
    void fetchBackendTelemetryStatus(otelDebug).then(backendTelemetryEnabled => {
      if (!backendTelemetryEnabled) {
        if (otelDebug) {
          console.log("[OTel] Telemetry disabled (backend telemetry not enabled)");
        }
        return;
      }

      const otelConfig = {
        enabled: true,
        serviceName: String(runtimeConfig.public?.otelServiceName || "homebox-frontend"),
        serviceVersion: String(runtimeConfig.public?.otelServiceVersion || "1.0.0"),
        useBackendProxy: true,
        sampleRate: parseFloat(String(runtimeConfig.public?.otelSampleRate || "1.0")),
        debug: otelDebug,
      };

      initializeOTel(otelConfig);
    });
  });

  return {
    provide: {
      // Telemetry initialization is intentionally asynchronous and no longer
      // part of the critical rendering path.
      otelEnabled: false,
    },
  };
});
