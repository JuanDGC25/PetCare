import { vi } from 'vitest';

export function mockFetch(...responses: { status?: number; body?: unknown }[]) {
  const fn = vi.fn();
  for (const { status = 200, body = {} } of responses) {
    fn.mockResolvedValueOnce(new Response(status === 204 ? null : JSON.stringify(body), { status }));
  }
  vi.stubGlobal('fetch', fn);
  return fn;
}
