const Facade = require('../../lib/facade');

describe('Facade', () => {
  it('gets all sorted', async () => {
    const schema = {
      find: () => ({ sort: () => ({ lean: () => ({ exec: () => Promise.resolve(true) }) }) }),
    };
    const facade = new Facade(schema);
    const result = await facade.findSort();
    expect(result).toBe(true);
  });
  it('throws error on gets all sorted', async () => {
    const schema = {
      find: () => ({ sort: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('bad')) }) }) }),
    };
    const facade = new Facade(schema);
    await expect(facade.findSort()).rejects.toThrow('bad');
  });
});
