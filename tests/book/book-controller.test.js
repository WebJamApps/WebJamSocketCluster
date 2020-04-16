const controller = require('../../model/book/book-controller');

describe('bookController', () => {
  it('is defined', () => {
    expect(controller).toBeDefined();
  });
  it('handles error on getAll', async () => {
    controller.model.find = jest.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.getAll()).rejects.toThrow('bad');
  });
});
