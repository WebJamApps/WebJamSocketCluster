/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import AgController from '../../src/app/AgController';

const testId = mongoose.Types.ObjectId();
const delay = (ms: any) => new Promise((resolve) => setTimeout(() => resolve(true), ms));
const aStub = {
  exchange: { transmitPublish: jest.fn() },
  listener: (name: any) => ({
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
            transmit: () => { },
            receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
          },
        },
      }),
    }),
  }),
};

describe('AgControler', () => {
  let r;
  afterEach(async () => {
    await delay(1000);
  });
  it('handles undefined disconnects', async () => {
    const agController = new AgController(aStub);
    const sStub = {
      id: '123',
      listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true }) }) }),
      transmit: () => { },
      receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
    };
    const to:any = null;
    agController.server.exchange.transmitPublish = jest.fn();
    agController.handleDisconnect(sStub, to);
    await delay(1000);
    expect(agController.server.exchange.transmitPublish).toHaveBeenCalled();
    await delay(1000);
  });
  it('handles disconnects and removes the client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      id: '123',
      listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
      transmit: () => { },
      receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
    };
    const to:any = null;
    agController.handleDisconnect(sStub, to);
    await delay(2000);
    expect(agController.clients.length).toBe(0);
    await delay(1000);
  });
  it('sends a pulse', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
      },
    };
    global.setInterval = jest.fn((cb:any) => cb());
    agController.server.exchange.transmitPublish = jest.fn();
    agController.sendPulse(sStub);
    expect(agController.server.exchange.transmitPublish).toHaveBeenCalled();
  });
  // it('accepts the initial message from client', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: 123, done: true }) }) }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   r = await agController.handleReceiver(sStub);
  //   expect(r).toBe(true);
  // });
  // it('gets all tours', async () => {
  //   const agController = new AgController(aStub);
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: 123, done: true }) }) }),
  //     },
  //   };
  //   r = await agController.sendTours(sStub);
  //   expect(r).toBe(true);
  // });
  it('handles error when gets all tours', async () => {
    const agController = new AgController(aStub);
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: 123, done: true }) }) }),
      },
    };
    agController.tourController.getAllSort = jest.fn(() => Promise.reject(new Error('bad')));
    r = await agController.sendTours(sStub);
    expect(r).toBe('bad');
  });
  it('handles error when gets all books', async () => {
    const agController = new AgController(aStub);
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: 123, done: true }) }) }),
      },
    };
    agController.bookController.getAll = jest.fn(() => Promise.reject(new Error('bad')));
    r = await agController.sendBooks(sStub);
    expect(r).toBe('bad');
  });
  // it('updates a tours', async () => {
  //   const agController = new AgController(aStub);
  //   agController.tourController.findByIdAndUpdate = jest.fn(() => Promise.resolve(true));
  //   r = await agController.updateTour({ tourId: testId, tour: {} });
  //   expect(r).toBe(true);
  // });
  it('handles error from updates a tours', async () => {
    const agController = new AgController(aStub);
    agController.tourController.findByIdAndUpdate = jest.fn(() => Promise.reject(new Error('bad')));
    r = await agController.updateTour({ tourId: testId, tour: {} });
    expect(r).toBe('bad');
  });
  // it('process the newTour message from client', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //             value: {
  //               token: 'token',
  //               tour: {
  //                 date: 'date', time: 'time', location: 'location', venue: 'venue',
  //               },
  //             },
  //             done: true,
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   r = await agController.newTour(sStub);
  //   expect(r).toBe(true);
  // });
  // it('process the newImage message from client', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //             value: {
  //               token: 'token',
  //               image: {
  //                 title: 'title', url: 'url',
  //               },
  //             },
  //             done: true,
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   r = await agController.newImage(sStub);
  //   expect(r).toBe(true);
  // });
  // it('handles error from newImage', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //             value: {
  //               token: 'token',
  //               image: {
  //                 title: 'title', url: 'url',
  //               },
  //             },
  //             done: true,
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   agController.handleImage = jest.fn(() => Promise.reject(new Error('bad')));
  //   r = await agController.newImage(sStub);
  //   expect(r).toBe(true);
  // });
  // it('handles missing receiver value when process the newImage message from client', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //             done: true,
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   r = await agController.newImage(sStub);
  //   expect(r).toBe(true);
  // });
  // it('handles error from newTour', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //             value: {
  //               token: 'token',
  //               tour: {
  //                 date: 'date', time: 'time', location: 'location', venue: 'venue',
  //               },
  //             },
  //             done: true,
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   agController.handleTour = jest.fn(() => Promise.reject(new Error('bad')));
  //   r = await agController.newTour(sStub);
  //   expect(r).toBe(true);
  // });
  // it('handles missing receiver value when process the newTour message from client', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //             done: true,
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   r = await agController.newTour(sStub);
  //   expect(r).toBe(true);
  // });
  // it('process the deleteTour message from client', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //             value: {
  //               token: 'token',
  //               tour: {
  //                 tourId: '123',
  //               },
  //             },
  //             done: true,
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   r = await agController.removeTour(sStub);
  //   expect(r).toBe(true);
  // });
  // it('does not process the deleteTour message from client', async () => {
  //   const agController = new AgController(aStub);
  //   agController.clients = ['123'];
  //   const sStub = {
  //     socket: {
  //       id: '123',
  //       listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
  //       transmit: () => { },
  //       receiver: () => ({
  //         createConsumer: () => ({
  //           next: () => Promise.resolve({
  //           }),
  //         }),
  //       }),
  //     },
  //   };
  //   global.setInterval = jest.fn((cb:any) => cb());
  //   r = await agController.removeTour(sStub);
  //   expect(r).toBe(true);
  // });
  it('processes the editTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                tourId: '123',
                token: 'token',
                tour: {
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    global.setInterval = jest.fn((cb:any) => cb());
    agController.updateTour = jest.fn();
    agController.editTour(sStub);
    await delay(1000);
    expect(agController.updateTour).toHaveBeenCalled();
  });
  it('does not process the editTour message from client when token is missing', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                tourId: '123',
                tour: {
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    global.setInterval = jest.fn((cb:any) => cb());
    agController.updateTour = jest.fn();
    agController.editTour(sStub);
    await delay(1000);
    expect(agController.updateTour).not.toHaveBeenCalled();
  });
  it('does not process the editTour message from client when receiver has no value', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
            }),
          }),
        }),
      },
    };
    global.setInterval = jest.fn((cb:any) => cb());
    agController.updateTour = jest.fn();
    agController.editTour(sStub);
    delay(1000);
    expect(agController.updateTour).not.toHaveBeenCalled();
  });
  it('handles error when process the editTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                tourId: '123',
                token: 'token',
                tour: {
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    global.setInterval = jest.fn((cb:any) => cb());
    agController.tourController.findByIdAndUpdate = jest.fn(() => Promise.reject(new Error('bad')));
    agController.server.exchange.transmitPublish = jest.fn();
    agController.editTour(sStub);
    await delay(1000);
    expect(agController.server.exchange.transmitPublish).not.toHaveBeenCalled();
  });
  it('handles missing token when the deleteTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: null,
                tour: {
                  tourId: '123',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    global.setInterval = jest.fn((cb:any) => cb());
    agController.handleTour = jest.fn();
    agController.removeTour(sStub);
    await delay(1000);
    expect(agController.handleTour).not.toHaveBeenCalled();
  });
  it('creates tours', async () => {
    const agController = new AgController(aStub);
    r = await agController.handleTour('createDocs', {
      date: 'date', time: 'time', location: 'location', venue: 'venue',
    }, 'tourCreated');
    expect(r).toBe('tour handled');
  });
  it('creates a book (image)', async () => {
    const agController = new AgController(aStub);
    r = await agController.handleImage('createDocs', {
      url: 'url', title: 'title', type: 'JaMmusic',
    }, 'imageCreated');
    expect(r).toBe('imageCreated');
  });
  it('handles error from creates tours', async () => {
    const agController = new AgController(aStub);
    agController.tourController.createDocs = jest.fn(() => Promise.reject(new Error('bad')));
    r = await agController.handleTour('createDocs', {
      date: 'date', time: 'time', location: 'location', venue: 'venue',
    }, 'tourCreated');
    expect(r).toBe('bad');
  });
});
