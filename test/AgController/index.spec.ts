/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import AgController from '../../src/AgController';
import utils from '../../src/AgController/utils';

const testId = new mongoose.Types.ObjectId();
const delay = (ms: any) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
const aStub:any = {
  exchange: { transmitPublish: jest.fn() },
  listener: (name: any) => ({
    once: () => {
      if (name === 'error') return Promise.resolve({ error: 'bad' });
      if (name === 'warning') return Promise.resolve({ warning: 'too hot' });
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
  let r, clientStub:any = {
    id: '123',
    listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
    transmit: () => { },
    receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
  };
  // afterEach(async () => {
  //   await delay(1000);
  // });
  it('addSocket', () => {
    const agController = new AgController(aStub);
    agController.handleReceiver = jest.fn();
    agController.sendPulse = jest.fn();
    agController.newTour = jest.fn();
    agController.removeTour = jest.fn();
    agController.editDoc = jest.fn();
    agController.newImage = jest.fn();
    agController.removeImage = jest.fn();
    const createConsumer = jest.fn(() => ({ next: jest.fn() }));
    const cStub = { ...clientStub, socket: { receiver: () => ({ createConsumer }) } };
    expect(agController.addSocket(cStub)).toBeUndefined();
    expect(agController.removeImage).toHaveBeenCalled();
  });
  it('handles undefined disconnects', async () => {
    const agController = new AgController(aStub);
    const sStub:any = {
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
    clientStub = {
      id: '123',
      listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
      transmit: () => { },
      receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
    };
    const to:any = null;
    agController.handleDisconnect(clientStub, to);
    await delay(2000);
    expect(agController.clients.length).toBe(0);
    await delay(1000);
  });
  it('sends a pulse', () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.server.exchange.transmitPublish = jest.fn();
    agController.sendPulse(sStub);
    expect(agController.server.exchange.transmitPublish).toHaveBeenCalled();
  });
  it('accepts the initial message from client', async () => {
    const agController = new AgController(aStub);
    agController.bookController.getAll = jest.fn(() => Promise.resolve([]));
    agController.clients = ['123'];
    const sStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: 123, done: true }) }) }),
      },
    };
    const setIntervalMock: any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.handleReceiver(sStub);
    await delay(1000);
    expect(agController.bookController.getAll).toHaveBeenCalled();
  });
  it('handleReceiver when no value', async () => {
    const agController = new AgController(aStub);
    agController.bookController.getAll = jest.fn(() => Promise.resolve([]));
    agController.clients = ['123'];
    const sStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: undefined, done: true }) }) }),
      },
    };
    const setIntervalMock: any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.handleReceiver(sStub);
    await delay(1000);
    expect(agController.bookController.getAll).not.toHaveBeenCalled();
  });
  it('gets all tours', async () => {
    const agController = new AgController(aStub);
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: 123, done: true }) }) }),
      },
    };
    agController.tourController.getAllSort = jest.fn(() => Promise.resolve([]));
    r = await agController.sendTours(cStub);
    expect(r).toBe('sent tours');
  });
  it('handles error when gets all tours', async () => {
    const agController = new AgController(aStub);
    const sStub:any = {
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
    const sStub:any = {
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
  it('updates a tours', async () => {
    const agController = new AgController(aStub);
    agController.tourController.findByIdAndUpdate = jest.fn(() => Promise.resolve(true));
    r = await agController.updateTour({
      tourId: testId,
      tour: {
        venue: 'venue', datetime: new Date(), city: 'city', usState: 'state', 
      }, 
    });
    expect(r).toBe('Gig updated');
  });
  it('handles error from updates a tours', async () => {
    const agController = new AgController(aStub);
    agController.tourController.findByIdAndUpdate = jest.fn(() => Promise.reject(new Error('bad')));
    r = await agController.updateTour({
      tourId: testId,
      tour: {
        venue: 'venue', datetime: new Date(), city: 'city', usState: 'state', 
      }, 
    });
    expect(r).toBe('bad');
  });
  it('does not process the newTour message from client when token is not valid', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.tourController.createDocs = jest.fn(() => Promise.resolve([]));
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                tour: {
                  date: 'date', time: 'time', location: 'location', venue: 'venue',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newTour(cStub);
    await delay(1000);
    expect(agController.tourController.createDocs).not.toHaveBeenCalled();
  });
  it('processes the newTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.tourController.createDocs = jest.fn(() => Promise.resolve([]));
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                tour: {
                  venue: 'venue', datetime: new Date(), city: 'city', usState: 'state', 
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    const verfyMock: any = jest.fn(() => '123');
    agController.jwt.verify = verfyMock;
    const getMock:any = jest.fn(() => ({
      set: () => ({
        set: () => Promise.resolve({
          body: 
      { userType: JSON.parse(process.env.userRoles || '{}').roles[0] }, 
        }), 
      }), 
    }));
    agController.superagent.get = getMock;
    agController.newTour(cStub);
    await delay(1000);
    expect(agController.tourController.createDocs).toHaveBeenCalled();
  });
  it('return the not allowed socketError when processes the newTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.tourController.createDocs = jest.fn(() => Promise.resolve([]));
    clientStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: jest.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                tour: {
                  date: 'date', time: 'time', location: 'location', venue: 'venue',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    const verifyMock: any = jest.fn(() => '123');
    agController.jwt.verify = verifyMock;
    const getMock:any = jest.fn(() => ({
      set: () => ({
        set: () => Promise.resolve({
          body: 
      { userType: 'cool' }, 
        }), 
      }), 
    }));
    agController.superagent.get = getMock;
    agController.newTour(clientStub);
    await delay(1000);
    expect(clientStub.socket.transmit).toHaveBeenCalledWith('socketError', { newTour: 'Not allowed to create new tour' });
  });

  it('return the invalid request socketError when processes the newTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.tourController.createDocs = jest.fn(() => Promise.resolve([]));
    clientStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: jest.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                tour: {
                  time: 'time', location: 'location', venue: 'venue',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    const verifyMock: any = jest.fn(() => '123');
    agController.jwt.verify = verifyMock;
    const getMock:any = jest.fn(() => ({
      set: () => ({
        set: () => Promise.resolve({
          body: 
      { userType: JSON.parse(process.env.userRoles || '{}').roles[0] }, 
        }), 
      }), 
    }));
    agController.superagent.get = getMock;
    agController.newTour(clientStub);
    await delay(1000);
    expect(clientStub.socket.transmit).toHaveBeenCalledWith(
      'socketError', 
      { newTour: 'Invalid create gig data' },
    );
  });
  it('handles missing receiver value when process the newTour message from client', () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    utils.handleTour = jest.fn();
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newTour(cStub);
    expect(utils.handleTour).not.toHaveBeenCalled();
  });
  it('process the newImage message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.bookController.createDocs = jest.fn(() => Promise.resolve());
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                image: {
                  title: 'title', url: 'url',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newImage(cStub);
    await delay(2000);
    expect(agController.bookController.createDocs).toHaveBeenCalled();
  });
  it('handles missing receiver value when process the newImage message from client', () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.bookController.createDocs = jest.fn(() => Promise.resolve());
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newImage(cStub);
    expect(agController.bookController.createDocs).not.toHaveBeenCalled();
  });
  it('process the removeImage message from client', async () => {
    const agController = new AgController(aStub);
    agController.handleImage = jest.fn();
    agController.clients = ['123'];
    agController.bookController.deleteById = jest.fn(() => Promise.resolve());
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                data: 'id',
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.removeImage(cStub);
    await delay(2000);
    expect(agController.handleImage).toHaveBeenCalled();
  });
  it('handles missing receiver value when process the removeImage message from client', () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.bookController.deleteById = jest.fn(() => Promise.resolve());
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.removeImage(cStub);
    expect(agController.bookController.deleteById).not.toHaveBeenCalled();
  });
  it('process the removeTour message from client', () => {
    const agController = new AgController(aStub);
    utils.handleTour = jest.fn();
    agController.clients = ['123'];
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
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
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    utils.removeTour = jest.fn(() => Promise.resolve());
    expect(agController.removeTour(cStub)).toBeUndefined();
  });
  it('does not process the removeTour message from client', () => {
    const agController = new AgController(aStub);
    utils.handleTour = jest.fn();
    agController.clients = ['123'];
    const cStub:any = {
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
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.removeTour(cStub);
    expect(utils.handleTour).not.toHaveBeenCalled();
  });
  it('processes the updateImage message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                imageId: '123',
                token: 'token',
                image: {
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock: any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateImage = jest.fn();
    agController.editDoc(sStub, 'updateImage');
    await delay(1000);
    expect(agController.updateImage).toHaveBeenCalled();
  });
  it('does not processes the updateImage message from client if receiver has no value', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock: any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateImage = jest.fn();
    agController.editDoc(sStub, 'updateImage');
    await delay(1000);
    expect(agController.updateImage).not.toHaveBeenCalled();
  });
  it('processes the editTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub:any = {
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
    const setIntervalMock: any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateTour = jest.fn();
    agController.editDoc(sStub, 'editTour');
    await delay(1000);
    expect(agController.updateTour).toHaveBeenCalled();
  });
  it('does not process the editTour message from client when token is missing', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub:any = {
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
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateTour = jest.fn();
    agController.editDoc(sStub, 'editTour');
    await delay(1000);
    expect(agController.updateTour).not.toHaveBeenCalled();
  });
  it('handles error when process the editTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub:any = {
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
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.tourController.findByIdAndUpdate = jest.fn(() => Promise.reject(new Error('bad')));
    agController.server.exchange.transmitPublish = jest.fn();
    agController.editDoc(sStub, 'editTour');
    await delay(1000);
    expect(agController.server.exchange.transmitPublish).not.toHaveBeenCalled();
  });
  it('handles missing token when the deleteTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    const sStub:any = {
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
    const setIntervalMock:any = jest.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    utils.handleTour = jest.fn();
    agController.removeTour(sStub);
    await delay(1000);
    expect(utils.handleTour).not.toHaveBeenCalled();
  });
  it('creates a book (image)', async () => {
    const agController = new AgController(aStub);
    r = await agController.handleImage('createDocs', {
      url: 'url', title: 'title', type: 'JaMmusic',
    }, 'imageCreated');
    expect(r).toBe('imageCreated');
  });
  it('returns error message when creates a book (image)', async () => {
    const agController = new AgController(aStub);
    agController.bookController.createDocs = jest.fn(() => Promise.reject(new Error('bad')));
    r = await agController.handleImage('createDocs', {
      url: 'url', title: 'title', type: 'JaMmusic',
    }, 'imageCreated');
    expect(r).toBe('bad');
    await delay(1000);
  });
  it('updateImage when id not found', async () => {
    clientStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const agController = new AgController(aStub);
    r = await agController.updateImage(
      {
        token: 'token',
        editPic: {
          _id: new mongoose.Types.ObjectId(),
          title: 'title',
          url: 'url',
          comments: 'comments', 
        },
      }, 
      clientStub,
    );
    expect(r).toBe('Id Not Found');
    await delay(1000);
  });
  it('updateImage throws error invalid token', async () => {
    clientStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const agController = new AgController(aStub);
    const token:any = 0;
    let eMessage = '';
    try {
      await agController.updateImage(
        {
          token,
          editPic: {
            _id: new mongoose.Types.ObjectId(),
            title: 'title',
            url: 'url',
            comments: 'comments', 
          },
        }, 
        clientStub,
      );
    } catch (e) { eMessage = (e as Error).message; }
    expect(eMessage).toBe('invalid token');
  });
  it('updateImage success', async () => {
    clientStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const agController = new AgController(aStub);
    agController.bookController.findByIdAndUpdate = jest.fn(() => Promise.resolve());
    r = await agController.updateImage(
      {
        token: 'token',
        editPic: {
          _id: new mongoose.Types.ObjectId(),
          title: 'title',
          url: 'url',
          comments: 'comments', 
        },
      }, 
      clientStub,
    );
    expect(r).toBe('image updated');
    await delay(1000);
  });
  // it('creates tours', async () => {
  //   const agController = new AgController(aStub);
  //   r = await utils.handleTour('createDocs', {
  //     datetime: new Date(), venue: 'venue', city: 'city', usState: 'state',
  //   }, 'tourCreated');
  //   expect(r).toBe('tour handled');
  //   await delay(1000);
  // });
  // it('handles error from creates tours', async () => {
  //   const agController = new AgController(aStub);
  //   agController.tourController.createDocs = jest.fn(() => Promise.reject(new Error('bad')));
  //   r = await utils.handleTour('createDocs', {
  //     datetime: new Date(), venue: 'venue', city: 'city', usState: 'state',
  //   }, 'tourCreated');
  //   expect(r).toBe('bad');
  //   await delay(1000);
  // });
});
