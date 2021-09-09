import httpServer from '../src/app/httpServer';

httpServer.listen = jest.fn();
import * as server from '../src/index';

const delay = (ms: any) => new Promise((resolve) => setTimeout(() => resolve(true), ms));

describe('server', () => {
  it('is defines the server', async () => {   
    expect(server).toBeDefined();
    await delay(2000);
  });
});
