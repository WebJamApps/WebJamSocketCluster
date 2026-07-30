import Controller from '../../src/lib/controller.js';
import type Facade from '../../src/lib/facade.js';

describe('Lib Controller', () => {
  const modelStub = {
    find: () => Promise.resolve([]),
  };
  it('getAll', async () => {
    const controller = new Controller(modelStub as unknown as Facade<never>);
    const result = await controller.getAll();
    expect(result.length).toBe(0);
  });
});
