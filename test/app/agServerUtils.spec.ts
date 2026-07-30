import type socketClusterServer from 'socketcluster-server';
import type ConsumableStream from 'consumable-stream';
import agServerUtils from '../../src/app/agServerUtils.js';
import type AgController from '../../src/AgController/index.js';

describe('agServerUtils', () => {
  let r: boolean;
  const aStub: unknown = {
    exchange: { transmitPublish: () => {} },
    listener: (name: string) => ({
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
    r = await agServerUtils.handleErrAndWarn(2, 8888, aStub as socketClusterServer.AGServer);
    expect(r).toBe(true);
  });
  it('should wait unit tests finish before exiting', async () => {
    const delay = (ms: number) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
    await delay(1000);
  });
  it('should handleConnecions', async () => {
    const socket = { done: true, value: { id: 'id' } };
    const c = { next: vi.fn(() => Promise.resolve(socket)) } as unknown as ConsumableStream.Consumer<socketClusterServer.AGServer.ConnectionData>;
    const addSocketMock = vi.fn();
    const a = { addSocket: addSocketMock } as unknown as AgController;
    expect(await agServerUtils.handleConnections(c, a)).toBe(undefined);
    expect(addSocketMock).toHaveBeenCalledWith(socket.value);
  });
});
