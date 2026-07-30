import type { Express } from 'express';
import appUtils from '../../src/app/appUtils.js';

describe('appUtils', () => {
  let r: boolean;
  it('is defined', () => {
    expect(appUtils).toBeDefined();
  });
  it('sets up the express app with a route', () => {
    const res = { status: () => ({ send: (msg: unknown) => { expect(msg).toBe('OK'); } }) };
    const eStub = { get: (route: string, cb: (req: unknown, res: unknown) => void) => { cb({}, res); } };
    const hStub = {
      listener: () => ({
        createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: [{ url: '/health-check' }] }) }),
        once: () => Promise.resolve([{ requestData: 'howdy' }]),
      }),
    };
    appUtils.setup(eStub as unknown as Express, hStub as never);
  });
  it('handles an http request', () => {
    const eStub2 = (data: { requestData?: string }) => { expect(data.requestData).toBe('howdy'); };
    r = appUtils.handleRequest(eStub2 as unknown as Express, [{ requestData: 'howdy' }] as never);
    expect(r).toBe(true);
  });
});
