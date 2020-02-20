const agServerUtils = require('../../controller/agServerUtils');

describe('agServerUtils', () => {
  let testMsg, r;
  const aStub = {
    listener: (name) => ({
      once: () => {
        if (name === 'error') return Promise.resolve({ error: 'bad' });
        if (name === 'warning') Promise.resolve({ warning: 'too hot' });
        return Promise.resolve({ socket: { receiver: (msg) => ({ once: () => { testMsg = msg; return Promise.resolve(123); } }) } });
      },
    }),
  };
  it('handles errors and warnings', async () => {
    r = await agServerUtils.handleErrAndWarn(2, 8888, aStub);
    expect(r).toBe(true);
  });
  it('handles routing', async () => {
    r = await agServerUtils.routing(aStub);
    expect(r).toBe(true);
    expect(testMsg).toBe('howdy');
  });
});
