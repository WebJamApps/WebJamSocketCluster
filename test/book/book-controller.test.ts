import controller from '../../src/model/book/book-controller.js';

describe('bookController', () => {
  it('is defined', () => {
    expect(controller).toBeDefined();
  });
  it('handles error on getAll', async () => {
    controller.model.find = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.getAll()).rejects.toThrow('bad');
  });
  it('should wait unit tests finish before exiting', async () => {
    const delay = (ms: any) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
    await delay(1000);
  });
});
