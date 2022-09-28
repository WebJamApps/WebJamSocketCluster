import httpServer from '../src/app/httpServer';
import * as server from '../src/index';

httpServer.listen = jest.fn();

const delay = (ms: any) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });

describe('server', () => {
  it('is defines the server', async () => {   
    expect(server).toBeDefined();
    await delay(2000);
  });
});
