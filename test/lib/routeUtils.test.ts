import type { Express } from 'express';
import routeUtils from '#src/lib/routeUtils.js';

describe('routeUtils', () => {
  it('setRoot', () => {
    const res = { sendFile: vi.fn() };
    const req = vi.fn();
    const app = {
      get: (url: string, cb: (rq: unknown, rs: unknown) => void) => cb(req, res),
    };
    routeUtils.setRoot(app as unknown as Express);
    expect(res.sendFile).toHaveBeenCalledTimes(2);
  });
});
