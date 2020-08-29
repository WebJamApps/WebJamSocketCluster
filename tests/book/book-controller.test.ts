import controller from '../../src/model/book/book-controller';

describe('bookController', () => {
  it('is defined', () => {
    expect(controller).toBeDefined();
  });
  it('handles error on getAll', async () => {
    controller.model.find = jest.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.getAll()).rejects.toThrow('bad');
  });
  it('should wait unit tests finish before exiting', async () => { // eslint-disable-line jest/expect-expect
    const delay = (ms: any) => new Promise((resolve) => setTimeout(() => resolve(true), ms));
    await delay(1000);
  });
});
