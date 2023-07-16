/* eslint-disable @typescript-eslint/no-explicit-any */
import agServerUtils from '../../src/app/agServerUtils';

describe('agServerUtils', () => {
  let r;
  const aStub:any = {
    exchange: { transmitPublish: () => {} },
    listener: (name: any) => ({
      once: () => {
        if (name === 'error') return Promise.resolve({ error: 'bad' });
        if (name === 'warning') return Promise.resolve({ warning: 'too hot' });
        return Promise.resolve({ socket: { receiver: () => ({ once: () => Promise.resolve(123) }) } });
      },
      createConsumer: () => ({
        next: () => Promise.resolve({
          done: true,
          value: {
            id: '123',
            socket: {
              listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
              transmit: () => {},
              receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
            },
          },
        }),
      }),
    }),
  };
  it('handles errors and warnings', async () => {
    r = await agServerUtils.handleErrAndWarn(2, 8888, aStub);
    expect(r).toBe(true);
  });
  it('should wait unit tests finish before exiting', async () => { // eslint-disable-line jest/expect-expect
    const delay = (ms: any) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
    await delay(1000);
  });
  it('should handleConnecions', async () => {
    const socket = { done: true, value: { id: 'id' } };
    const c:any = { next: jest.fn(() => Promise.resolve(socket)) };
    const a:any = { addSocket: jest.fn() };
    expect(await agServerUtils.handleConnections(c, a)).toBe(undefined);
    expect(a.addSocket).toHaveBeenCalledWith(socket.value);
  });
});
