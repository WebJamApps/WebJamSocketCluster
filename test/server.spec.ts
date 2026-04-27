import httpServer from '../src/app/httpServer.js';

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
httpServer.listen = vi.fn() as unknown as typeof httpServer.listen;
const server = await import('../src/index.js');

const delay = (ms: any) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });

describe('server', () => {
  it('is defines the server', async () => {
    expect(server).toBeDefined();
    await delay(2000);
  });
});
