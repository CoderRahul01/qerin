// Races a promise against a timer so one hung upstream call (a paid source
// that never responds, an LLM provider stalling mid-request) can't block the
// whole answer indefinitely. This does not cancel the underlying request —
// Workers has no reliable way to abort an in-flight fetch once the caller
// has stopped waiting on it — it only stops *this* request from waiting on
// it forever. The loser keeps running to completion in the background and
// its result is simply discarded.
export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
