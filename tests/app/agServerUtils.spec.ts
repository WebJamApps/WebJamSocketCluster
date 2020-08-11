import agServerUtils from '../../src/app/agServerUtils';
import tourController from '../../src/model/tour/tour-controller';

describe('agServerUtils', () => {
  let r;
  const aStub = {
    exchange: { transmitPublish: () => {} },
    listener: (name) => ({
      once: () => {
        if (name === 'error') return Promise.resolve({ error: 'bad' });
        if (name === 'warning') Promise.resolve({ warning: 'too hot' });
        return Promise.resolve({ socket: { receiver: () => ({ once: () => Promise.resolve(123) }) } });
      },
      createConsumer: () => ({
        next: () => Promise.resolve({
          done: true,
          value: {
            id: '123',
            socket: {
              listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
              transmit: () => {},
              receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
            },
          },
        }),
      }),
    }),
  };
  it('handles errors and warnings', async () => {
    r = await agServerUtils.handleErrAndWarn(2, 8888, aStub);
    expect(r).toBe(true);
  });
  it('handles routing', async () => {
    r = await agServerUtils.routing(aStub);
    expect(r).toBe(true);
  });
  it('handles routing but has an error on resetData', async () => {
    tourController.createDocs = jest.fn(() => Promise.reject(new Error('bad')));
    r = await agServerUtils.routing(aStub);
    expect(r).toBe(true);
  });
  it('should wait unit tests finish before exiting', async () => { // eslint-disable-line jest/expect-expect
    const delay = (ms) => new Promise((resolve) => setTimeout(() => resolve(true), ms));
    await delay(1000);
  });
});
