const httpServer = require('../httpServer');

describe('server', () => {
  it('is defines the server', () => {
    httpServer.listen = jest.fn();
    const server = require('../server'); // eslint-disable-line global-require
    expect(server).toBeDefined();
  });
});
