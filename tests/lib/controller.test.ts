import Controller from '../../src/lib/controller';

describe('Lib Controller', () => {
  const modelStub = {
    find: () => Promise.resolve([]),
  };
  it('getAll', async () => {
    const controller = new Controller(modelStub);
    const result = await controller.getAll();
    expect(result.length).toBe(0);
  });
});
