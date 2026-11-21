// Small helpers shared by the simulated services in src/sim/. Nothing here mirrors a real API.

/** Text the playground wrote itself (not a real service's wording) starts with this label. */
export const PG_LABEL = 'Playground:';

/** Prefixes `text` with the playground label. */
export const pg = (text: string) => `${PG_LABEL} ${text}`;

/** A made-up id for one simulated operation, marked as simulated. */
export const simulatedId = () => `simulated-${crypto.randomUUID()}`;

/** Waits `ms` milliseconds, or rejects with the signal's reason when it is aborted first. */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal!.reason);
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
