import appUtils from '../../src/app/appUtils';

describe('appUtils', () => {
  let r;
  it('is defined', () => {
    expect(appUtils).toBeDefined();
  });
  it('sets up the express app with a route', async () => {
    const res = { status: () => ({ send: (msg) => { expect(msg).toBe('OK'); } }) };
    const eStub = { get: (route, cb) => { cb({}, res); } };
    const hStub = {
      listener: () => ({
        createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: [{ url: '/health-check' }] }) }),
        once: () => Promise.resolve([{ requestData: 'howdy' }]),
      }),
    };
    await appUtils.setup(eStub, hStub);
  });
  it('handles an http request', () => {
    const eStub2 = (data) => { expect(data.requestData).toBe('howdy'); };
    r = appUtils.handleRequest(eStub2, [{ requestData: 'howdy' }]);
    expect(r).toBe(true);
  });
});
