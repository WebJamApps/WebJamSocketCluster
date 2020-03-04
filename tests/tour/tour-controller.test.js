const controller = require('../../model/tour/tour-controller');

describe('TourController', () => {
  it('deletes all tours', async () => {
    controller.model.deleteMany = jest.fn(() => Promise.resolve(true));
    const result = await controller.deleteAllDocs();
    expect(result).toBe(true);
  });
  it('throws error on deletes all tours', async () => {
    controller.model.deleteMany = jest.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.deleteAllDocs()).rejects.toThrow('bad');
  });
  it('throws error on make one tour', async () => {
    controller.model.create = jest.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.createDocs()).rejects.toThrow('bad');
  });
  it('handles error on gets all tours sorted', async () => {
    controller.model.findSort = jest.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.getAllSort()).rejects.toThrow('bad');
  });
});
