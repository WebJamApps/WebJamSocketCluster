import routeUtils from 'src/lib/routeUtils';

describe('routeUtils', () => {
  it('setRoot', () => {
    const res = { sendFile: jest.fn() };
    const req = jest.fn();
    const app:any = {
      get: (url:string, cb:any) => cb(req, res),
    };
    routeUtils.setRoot(app);
    expect(res.sendFile).toHaveBeenCalledTimes(2);
  });
});
