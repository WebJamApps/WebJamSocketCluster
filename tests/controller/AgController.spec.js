const AgController = require('../../controller/AgController');

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
describe('AgControler', () => {
  let r;
  it('handles undefined disconnects', async () => {
    const agController = new AgController(aStub);
    const sStub = {
      id: '123',
      listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true }) }) }),
      transmit: () => {},
      receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
    };
    r = await agController.handleDisconnect(sStub, null);
    expect(r).toBe(true);
  });
  it('handles disconnects and removes the client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      id: '123',
      listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
      transmit: () => {},
      receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
    };
    r = await agController.handleDisconnect(sStub, null);
    expect(r).toBe(true);
  });
  it('sends a pulse', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => {},
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
      },
    };
    global.setInterval = jest.fn((cb) => cb());
    r = await agController.sendPulse(sStub);
    expect(r).toBe(true);
  });
});
