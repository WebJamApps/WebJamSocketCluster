const httpServer = require('../src/controller/httpServer');

describe('server', () => {
  it('is defines the server', () => {
    httpServer.listen = jest.fn();
    const server = require('../src/server'); // eslint-disable-line global-require
    expect(server).toBeDefined();
  });
});
