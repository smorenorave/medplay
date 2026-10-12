/** End-to-end handler time (includes ORM waits and serialization, excludes network). */
export function withRouteTiming<A extends unknown[], R extends Response>(handler: (...args: A) => Promise<R>) {
  return async (...args: A): Promise<R> => {
    const start = performance.now();
    const response = await handler(...args);
    response.headers.append("Server-Timing", `app;dur=${(performance.now() - start).toFixed(2)}`);
    return response;
  };
}
