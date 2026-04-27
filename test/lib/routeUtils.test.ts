import routeUtils from '#src/lib/routeUtils.js';

describe('routeUtils', () => {
  it('setRoot', () => {
    const res = { sendFile: vi.fn() };
    const req = vi.fn();
    const app:any = {
      get: (url:string, cb:any) => cb(req, res),
    };
    routeUtils.setRoot(app);
    expect(res.sendFile).toHaveBeenCalledTimes(2);
  });
});
