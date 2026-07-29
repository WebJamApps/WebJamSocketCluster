/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import utils from '#src/AgController/utils.js';
import AgController from '#src/AgController/index.js';

const testId = new mongoose.Types.ObjectId();
const delay = (ms: any) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
const aStub:any = {
  exchange: { transmitPublish: vi.fn() },
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

const realHandleGig = utils.handleGig;
const realRemoveGig = utils.removeGig;

describe('AgControler', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    // Several tests replace these shared utils exports with vi.fn() stubs
    // (e.g. line ~483) without restoring them, which otherwise leaks into
    // later tests (like the #246 regression test) that need the real
    // implementation and silently breaks their assertions.
    utils.handleGig = realHandleGig;
    utils.removeGig = realRemoveGig;
  });
  let r, clientStub:any = {
    id: '123',
    listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
    transmit: () => { },
    receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: '456', done: true }) }) }),
  };
  it('addSocket', () => {
    const agController = new AgController(aStub);
    agController.handleReceiver = vi.fn();
    agController.sendPulse = vi.fn();
    agController.newGig = vi.fn();
    agController.removeGig = vi.fn();
    agController.editDoc = vi.fn();
    agController.newImage = vi.fn();
    agController.removeImage = vi.fn();
    agController.requestGigsForArtist = vi.fn();
    const createConsumer = vi.fn(() => ({ next: vi.fn() }));
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
    agController.server.exchange.transmitPublish = vi.fn();
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.server.exchange.transmitPublish = vi.fn();
    agController.sendPulse(sStub);
    expect(agController.server.exchange.transmitPublish).toHaveBeenCalled();
  });
  it('accepts the initial message from client', async () => {
    const agController = new AgController(aStub);
    agController.jamPicsController.getAll = vi.fn(() => Promise.resolve([]));
    agController.clients = ['123'];
    const sStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: 123, done: true }) }) }),
      },
    };
    const setIntervalMock: any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.handleReceiver(sStub);
    await delay(1000);
    expect(agController.jamPicsController.getAll).toHaveBeenCalled();
  });
  it('handleReceiver when no value', async () => {
    const agController = new AgController(aStub);
    agController.jamPicsController.getAll = vi.fn(() => Promise.resolve([]));
    agController.clients = ['123'];
    const sStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: () => { },
        receiver: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ value: undefined, done: true }) }) }),
      },
    };
    const setIntervalMock: any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.handleReceiver(sStub);
    await delay(1000);
    expect(agController.jamPicsController.getAll).not.toHaveBeenCalled();
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
    agController.gigController.getAllByArtistSort = vi.fn(() => Promise.resolve([]));
    r = await agController.sendGigs(cStub);
    expect(r).toBe('sent gigs');
  });
  it('gets gigs for a non-default artist on a scoped channel', async () => {
    const agController = new AgController(aStub);
    const cStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
      },
    };
    agController.gigController.getAllByArtistSort = vi.fn(() => Promise.resolve([{ venue: 'tim venue' }]));
    r = await agController.sendGigs(cStub, 'tim');
    expect(agController.gigController.getAllByArtistSort).toHaveBeenCalledWith('tim', { datetime: -1 });
    expect(cStub.socket.transmit).toHaveBeenCalledWith('allGigs:tim', [{ venue: 'tim venue' }]);
    expect(r).toBe('sent gigs');
  });
  it('requestGigsForArtist calls sendGigs with the requested artist', async () => {
    const agController = new AgController(aStub);
    agController.sendGigs = vi.fn();
    const cStub:any = {
      socket: {
        id: '123',
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({ value: { artist: 'tim' }, done: true }),
          }),
        }),
      },
    };
    agController.requestGigsForArtist(cStub);
    await delay(1000);
    expect(agController.sendGigs).toHaveBeenCalledWith(cStub, 'tim');
  });
  it('requestGigsForArtist ignores a missing artist', async () => {
    const agController = new AgController(aStub);
    agController.sendGigs = vi.fn();
    const cStub:any = {
      socket: {
        id: '123',
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({ value: undefined, done: true }),
          }),
        }),
      },
    };
    agController.requestGigsForArtist(cStub);
    await delay(1000);
    expect(agController.sendGigs).not.toHaveBeenCalled();
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
    agController.gigController.getAllByArtistSort = vi.fn(() => Promise.reject(new Error('bad')));
    r = await agController.sendGigs(sStub);
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
    agController.jamPicsController.getAll = vi.fn(() => Promise.reject(new Error('bad')));
    r = await agController.sendBooks(sStub);
    expect(r).toBe('bad');
  });
  it('sends jamPics on the jamPics message', async () => {
    const agController = new AgController(aStub);
    const cStub:any = { socket: { id: '123', transmit: vi.fn() } };
    agController.jamPicsController.getAll = vi.fn(() => Promise.resolve([{ title: 'a pic' }]));
    r = await agController.sendJamPics(cStub);
    expect(cStub.socket.transmit).toHaveBeenCalledWith('jamPics', [{ title: 'a pic' }]);
    expect(r).toBe('sent jamPics');
  });
  it('handles error when gets jamPics', async () => {
    const agController = new AgController(aStub);
    const cStub:any = { socket: { id: '123', transmit: vi.fn() } };
    agController.jamPicsController.getAll = vi.fn(() => Promise.reject(new Error('bad')));
    r = await agController.sendJamPics(cStub);
    expect(r).toBe('bad');
  });
  it('updates a tours', async () => {
    const agController = new AgController(aStub);
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.resolve(true));
    r = await agController.updateGig({
      tourId: testId,
      tour: {
        venue: 'venue', datetime: new Date(), city: 'city', usState: 'state', 
      }, 
    });
    expect(r).toBe('Gig updated');
  });
  it('rethrows a database failure from updateGig instead of swallowing it (#253)', async () => {
    const agController = new AgController(aStub);
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(agController.updateGig({
      tourId: testId,
      tour: {
        venue: 'venue', datetime: new Date(), city: 'city', usState: 'state',
      },
    })).rejects.toThrow('bad');
  });
  it('rethrows a validation failure from updateGig instead of swallowing it (#253)', async () => {
    const agController = new AgController(aStub);
    await expect(agController.updateGig({
      gigId: testId,
      gig: {},
    })).rejects.toThrow('Invalid gig data');
  });
  it('updates a gig when venueId is set and venue/city/usState are empty strings (#256)', async () => {
    const agController = new AgController(aStub);
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.resolve(true));
    r = await agController.updateGig({
      gigId: testId,
      gig: {
        venueId: testId, datetime: new Date(), venue: '', city: '', usState: '',
      },
    });
    expect(r).toBe('Gig updated');
  });
  it('updates a one-off gig with only free-text venue set and no venueId (#256)', async () => {
    const agController = new AgController(aStub);
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.resolve(true));
    r = await agController.updateGig({
      gigId: testId,
      gig: { venue: 'The Local Bar', datetime: new Date() },
    });
    expect(r).toBe('Gig updated');
  });
  it('rejects updateGig when neither venueId nor venue is set (#256)', async () => {
    const agController = new AgController(aStub);
    await expect(agController.updateGig({
      gigId: testId,
      gig: { datetime: new Date() },
    })).rejects.toThrow('Invalid gig data');
  });
  it('rejects updateGig when datetime is missing even though venueId is set (#256)', async () => {
    const agController = new AgController(aStub);
    await expect(agController.updateGig({
      gigId: testId,
      gig: { venueId: testId },
    })).rejects.toThrow('Invalid gig data');
  });
  it('does not process the newTour message from client when token is not valid', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newGig(cStub, 'newGig');
    await delay(1000);
    expect(agController.gigController.createDocs).not.toHaveBeenCalled();
  });
  it('processes the newTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    const verfyMock: any = vi.fn(() => '123');
    agController.jwt.verify = verfyMock;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userType: JSON.parse(process.env.userRoles || '{}').roles[0] }),
    }));
    agController.newGig(cStub, 'newGig');
    await delay(1000);
    expect(agController.gigController.createDocs).toHaveBeenCalled();
  });
  it('return the not allowed socketError when processes the newTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    clientStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: vi.fn(),
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    const verifyMock: any = vi.fn(() => '123');
    agController.jwt.verify = verifyMock;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userType: 'cool' }),
    }));
    agController.newGig(clientStub, 'newGig');
    await delay(1000);
    expect(clientStub.socket.transmit).toHaveBeenCalledWith('socketError', { newGig: 'Not allowed to create new gig' });
  });

  it('allows newTour when user has tour:create privilege (capability path)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.jwt.verify = vi.fn(() => '123') as any;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userType: 'unrecognized-role', privileges: ['tour:create'] }),
    }));
    agController.newGig(cStub, 'newGig');
    await delay(1000);
    expect(agController.gigController.createDocs).toHaveBeenCalled();
  });

  it('rejects newTour with missing capability error when privileges lack tour:create', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: vi.fn(),
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.jwt.verify = vi.fn(() => '123') as any;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userType: 'unrecognized-role', privileges: ['song:read'] }),
    }));
    agController.newGig(cStub, 'newGig');
    await delay(1000);
    expect(cStub.socket.transmit).toHaveBeenCalledWith('socketError', { newGig: 'missing capability gig:create' });
  });

  it('return the invalid request socketError when processes the newTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    clientStub = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: vi.fn(),
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    const verifyMock: any = vi.fn(() => '123');
    agController.jwt.verify = verifyMock;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userType: JSON.parse(process.env.userRoles || '{}').roles[0] }),
    }));
    agController.newGig(clientStub, 'newGig');
    await delay(1000);
    expect(clientStub.socket.transmit).toHaveBeenCalledWith(
      'socketError',
      { newGig: 'Invalid create gig data' },
    );
  });
  it('creates a gig when venueId is set and venue/city/usState are empty strings (#256)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
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
                gig: {
                  venueId: testId, datetime: new Date(), venue: '', city: '', usState: '',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newGig(cStub, 'newGig');
    await delay(1000);
    expect(agController.gigController.createDocs).toHaveBeenCalled();
  });
  it('creates a one-off gig with only free-text venue set and no venueId (#256)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
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
                gig: { venue: 'The Local Bar', datetime: new Date() },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newGig(cStub, 'newGig');
    await delay(1000);
    expect(agController.gigController.createDocs).toHaveBeenCalled();
  });
  it('rejects newGig with neither venueId nor venue (#256)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    const eStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                gig: { datetime: new Date() },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newGig(eStub, 'newGig');
    await delay(1000);
    expect(eStub.socket.transmit).toHaveBeenCalledWith('socketError', { newGig: 'Invalid create gig data' });
  });
  it('rejects newGig when datetime is missing even though venueId is set (#256)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    const eStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'token',
                gig: { venueId: testId },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newGig(eStub, 'newGig');
    await delay(1000);
    expect(eStub.socket.transmit).toHaveBeenCalledWith('socketError', { newGig: 'Invalid create gig data' });
  });
  it('handles missing receiver value when process the newTour message from client', () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    utils.handleGig = vi.fn();
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newGig(cStub, 'newGig');
    expect(utils.handleGig).not.toHaveBeenCalled();
  });
  it('keeps handling newGig on the same socket after an earlier newGig errored (#246)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.gigController.createDocs = vi.fn(() => Promise.resolve([]));
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    const transmit = vi.fn();
    let call = 0;
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit,
        receiver: () => ({
          createConsumer: () => ({
            next: () => {
              call += 1;
              // First newGig on this socket: invalid gig data -> throws, must NOT break the loop.
              if (call === 1) {
                return Promise.resolve({
                  value: { token: 'token', gig: { venue: 'venue' } },
                  done: false,
                });
              }
              // Second newGig on the SAME socket/consumer: valid data -> must still be handled.
              return Promise.resolve({
                value: {
                  token: 'token',
                  gig: {
                    venue: 'venue', datetime: new Date(), city: 'city', usState: 'state',
                  },
                },
                done: true,
              });
            },
          }),
        }),
      },
    };
    agController.newGig(cStub, 'newGig');
    await delay(1000);
    expect(transmit).toHaveBeenCalledWith('socketError', { newGig: 'Invalid create gig data' });
    expect(agController.gigController.createDocs).toHaveBeenCalled();
  });
  it('process the newImage message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.jamPicsController.createDocs = vi.fn(() => Promise.resolve());
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newImage(cStub);
    await delay(2000);
    expect(agController.verifyAdminWrite).toHaveBeenCalledWith('token');
    expect(agController.jamPicsController.createDocs).toHaveBeenCalled();
  });
  it('rejects newImage when the token is invalid (#94)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.jamPicsController.createDocs = vi.fn(() => Promise.resolve());
    agController.verifyAdminWrite = vi.fn(() => Promise.reject(new Error('jwt malformed')));
    const cStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'bad-token',
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
    agController.newImage(cStub);
    await delay(1000);
    expect(agController.jamPicsController.createDocs).not.toHaveBeenCalled();
    expect(cStub.socket.transmit).toHaveBeenCalledWith('socketError', { newImage: 'jwt malformed' });
  });
  it('rejects newImage when userType is not an allowed admin role (#94)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.jamPicsController.createDocs = vi.fn(() => Promise.resolve());
    agController.jwt.verify = vi.fn(() => '123') as any;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ userType: 'cool' }),
    }));
    const cStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
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
    agController.newImage(cStub);
    await delay(1000);
    expect(agController.jamPicsController.createDocs).not.toHaveBeenCalled();
    expect(cStub.socket.transmit).toHaveBeenCalledWith('socketError', { newImage: 'Not allowed to create new gig' });
  });
  it('handles missing receiver value when process the newImage message from client', () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.jamPicsController.createDocs = vi.fn(() => Promise.resolve());
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.newImage(cStub);
    expect(agController.jamPicsController.createDocs).not.toHaveBeenCalled();
  });
  it('process the removeImage message from client', async () => {
    const agController = new AgController(aStub);
    agController.handleImage = vi.fn();
    agController.clients = ['123'];
    agController.jamPicsController.deleteById = vi.fn(() => Promise.resolve());
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.removeImage(cStub);
    await delay(2000);
    expect(agController.verifyAdminWrite).toHaveBeenCalledWith('token');
    expect(agController.handleImage).toHaveBeenCalled();
  });
  it('surfaces a genuine deleteById failure as socketError instead of a silent no-op (#1199)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.jamPicsController.deleteById = vi.fn(() => Promise.reject(new Error('Delete id not found')));
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    const transmit = vi.fn();
    const cStub:any = {
      socket: {
        id: '123',
        listener: () => ({ createConsumer: () => ({ next: () => Promise.resolve({ done: true, value: '1000' }) }) }),
        transmit,
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.removeImage(cStub);
    await delay(2000);
    expect(transmit).toHaveBeenCalledWith('socketError', { deleteImage: 'Delete id not found' });
    expect(aStub.exchange.transmitPublish).not.toHaveBeenCalledWith('imageDeleted', expect.anything());
  });
  it('rejects deleteImage when the token is missing/invalid (#94)', async () => {
    const agController = new AgController(aStub);
    agController.handleImage = vi.fn();
    agController.clients = ['123'];
    agController.verifyAdminWrite = vi.fn(() => Promise.reject(new Error('jwt must be provided')));
    const cStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                token: 'bad-token',
                data: 'id',
              },
              done: true,
            }),
          }),
        }),
      },
    };
    agController.removeImage(cStub);
    await delay(1000);
    expect(agController.handleImage).not.toHaveBeenCalled();
    expect(cStub.socket.transmit).toHaveBeenCalledWith('socketError', { deleteImage: 'jwt must be provided' });
  });
  it('handles missing receiver value when process the removeImage message from client', () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.jamPicsController.deleteById = vi.fn(() => Promise.resolve());
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.removeImage(cStub);
    expect(agController.jamPicsController.deleteById).not.toHaveBeenCalled();
  });
  it('process the removeGig message from client', async () => {
    const agController = new AgController(aStub);
    utils.handleGig = vi.fn();
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    utils.removeGig = vi.fn(() => Promise.resolve());
    expect(agController.removeGig(cStub, 'deleteGig')).toBeUndefined();
    await delay(1000);
    // #94: deleteGig must be wired to the same admin-write gate as newGig/newImage.
    expect(typeof (utils.removeGig as any).mock.calls[0][4]).toBe('function');
  });
  it('does not process the removeGig message from client', () => {
    const agController = new AgController(aStub);
    utils.handleGig = vi.fn();
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.removeGig(cStub, 'deleteGig');
    expect(utils.handleGig).not.toHaveBeenCalled();
  });
  it('processes the updateImage message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
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
    const setIntervalMock: any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateImage = vi.fn();
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
    const setIntervalMock: any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateImage = vi.fn();
    agController.editDoc(sStub, 'updateImage');
    await delay(1000);
    expect(agController.updateImage).not.toHaveBeenCalled();
  });
  it('processes the editTour message from client', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
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
    const setIntervalMock: any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateGig = vi.fn();
    agController.editDoc(sStub, 'editTour');
    await delay(1000);
    expect(agController.updateGig).toHaveBeenCalled();
  });
  it('rejects editGig when verifyAdminWrite fails (#94)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.updateGig = vi.fn();
    agController.verifyAdminWrite = vi.fn(() => Promise.reject(new Error('jwt malformed')));
    const sStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                gigId: '123',
                token: 'bad-token',
                gig: {},
              },
              done: true,
            }),
          }),
        }),
      },
    };
    agController.editDoc(sStub, 'editGig');
    await delay(1000);
    expect(agController.updateGig).not.toHaveBeenCalled();
    expect(sStub.socket.transmit).toHaveBeenCalledWith('socketError', { editGig: 'jwt malformed' });
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.updateGig = vi.fn();
    agController.editDoc(sStub, 'editTour');
    await delay(1000);
    expect(agController.updateGig).not.toHaveBeenCalled();
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.reject(new Error('bad')));
    agController.server.exchange.transmitPublish = vi.fn();
    agController.editDoc(sStub, 'editTour');
    await delay(1000);
    expect(agController.server.exchange.transmitPublish).not.toHaveBeenCalled();
  });
  it('transmits socketError with Invalid gig data when editGig fails validation (#253)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    const sStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                gigId: '123',
                token: 'token',
                gig: {},
              },
              done: true,
            }),
          }),
        }),
      },
    };
    agController.server.exchange.transmitPublish = vi.fn();
    agController.editDoc(sStub, 'editGig');
    await delay(1000);
    expect(sStub.socket.transmit).toHaveBeenCalledWith('socketError', { editGig: 'Invalid gig data' });
    expect(agController.server.exchange.transmitPublish).not.toHaveBeenCalled();
  });
  it('transmits socketError with the db message when editGig fails at the database layer (#253)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.reject(new Error('db exploded')));
    const sStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                gigId: '123',
                token: 'token',
                gig: {
                  venue: 'venue', datetime: new Date(), city: 'city', usState: 'state',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    agController.server.exchange.transmitPublish = vi.fn();
    agController.editDoc(sStub, 'editGig');
    await delay(1000);
    expect(sStub.socket.transmit).toHaveBeenCalledWith('socketError', { editGig: 'db exploded' });
    expect(agController.server.exchange.transmitPublish).not.toHaveBeenCalled();
  });
  it('publishes gigUpdated exactly once and transmits no socketError on a successful editGig (#253)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.resolve({ _id: '123' }));
    const sStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                gigId: '123',
                token: 'token',
                gig: {
                  venue: 'venue', datetime: new Date(), city: 'city', usState: 'state',
                },
              },
              done: true,
            }),
          }),
        }),
      },
    };
    agController.server.exchange.transmitPublish = vi.fn();
    agController.editDoc(sStub, 'editGig');
    await delay(1000);
    expect(agController.server.exchange.transmitPublish).toHaveBeenCalledTimes(1);
    expect(agController.server.exchange.transmitPublish).toHaveBeenCalledWith('gigUpdated', { _id: '123' });
    expect(sStub.socket.transmit).not.toHaveBeenCalledWith('socketError', expect.anything());
  });
  it('behaves identically for the legacy editTour alias on a database failure (#253)', async () => {
    const agController = new AgController(aStub);
    agController.clients = ['123'];
    agController.verifyAdminWrite = vi.fn(() => Promise.resolve());
    agController.gigController.findByIdAndUpdate = vi.fn(() => Promise.reject(new Error('bad')));
    const sStub:any = {
      socket: {
        id: '123',
        transmit: vi.fn(),
        receiver: () => ({
          createConsumer: () => ({
            next: () => Promise.resolve({
              value: {
                tourId: '123',
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
    agController.server.exchange.transmitPublish = vi.fn();
    agController.editDoc(sStub, 'editTour');
    await delay(1000);
    expect(sStub.socket.transmit).toHaveBeenCalledWith('socketError', { editTour: 'bad' });
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
    const setIntervalMock:any = vi.fn((cb:any) => cb());
    global.setInterval = setIntervalMock;
    utils.handleGig = vi.fn();
    agController.removeGig(sStub, 'deleteGig');
    await delay(1000);
    expect(utils.handleGig).not.toHaveBeenCalled();
  });
  it('creates a book (image)', async () => {
    const agController = new AgController(aStub);
    r = await agController.handleImage('createDocs', {
      url: 'url', title: 'title', type: 'JaMmusic',
    }, 'imageCreated');
    expect(r).toBe('imageCreated');
  });
  it('rethrows the error when creating a book (image) fails (#1199)', async () => {
    const agController = new AgController(aStub);
    agController.jamPicsController.createDocs = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(agController.handleImage('createDocs', {
      url: 'url', title: 'title', type: 'JaMmusic',
    }, 'imageCreated')).rejects.toThrow('bad');
    expect(aStub.exchange.transmitPublish).not.toHaveBeenCalledWith('imageCreated', expect.anything());
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
    agController.jamPicsController.findByIdAndUpdate = vi.fn(() => Promise.resolve());
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
});
