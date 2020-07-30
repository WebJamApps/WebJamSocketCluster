import httpServer from '../src/app/httpServer';

httpServer.listen = jest.fn();
// eslint-disable-next-line import/first
import * as server from '../src/index';

describe('server', () => {
  it('is defines the server', () => {   
    expect(server).toBeDefined();
  });
});
