import utils from '#src/AgController/utils.js';
import type GigController from '#src/model/gig/gig-controller.js';
import type JamPicsController from '#src/model/jamPics/jamPics-controller.js';

describe('AgController/utils', () => {
  it('resetData catches error', async () => {
    const deleteAllDocs = vi.fn(() => Promise.reject(new Error('bad')));
    const result = await utils.resetData(
      {} as never,
      {} as never,
      { deleteAllDocs } as unknown as typeof GigController,
      {} as unknown as typeof JamPicsController,
    );
    expect(result).toBe(false);
  });
  it('handleGig is successful', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const gigController = { createGig: vi.fn(() => Promise.resolve()) };
    await utils.handleGig('createGig', {}, 'created', gigController as unknown as typeof GigController, server);
    expect(transmitPublish).toHaveBeenCalled();
  });
  it('removeGig', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: vi.fn() } };
    const receiver = { value: { token: 'token', tour: { tourId: 'asdf' } } };
    const gigController = { deleteById: vi.fn(() => Promise.resolve()) };
    const verifyAdminWrite = vi.fn(() => Promise.resolve());
    await utils.removeGig(
      receiver,
      client,
      gigController as unknown as typeof GigController,
      server,
      verifyAdminWrite,
    );
    expect(verifyAdminWrite).toHaveBeenCalledWith('token');
    expect(transmitPublish).toHaveBeenCalled();
  });
  it('removeGig catches error', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: vi.fn() } };
    const receiver = { value: { token: 'token', tour: { tourId: 'asdf' } } };
    const gigController = { deleteById: vi.fn(() => Promise.reject(new Error('bad'))) };
    const verifyAdminWrite = vi.fn(() => Promise.resolve());
    await utils.removeGig(
      receiver,
      client,
      gigController as unknown as typeof GigController,
      server,
      verifyAdminWrite,
    );
    expect(transmitPublish).not.toHaveBeenCalled();
    expect(client.socket.transmit).toHaveBeenCalled();
  });
  it('removeGig does nothing when there is no gig/tour id (does not attempt auth)', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: vi.fn() } };
    const receiver = { value: { token: 'token', tour: {} } };
    const gigController = { deleteById: vi.fn(() => Promise.resolve()) };
    const verifyAdminWrite = vi.fn(() => Promise.resolve());
    await utils.removeGig(
      receiver,
      client,
      gigController as unknown as typeof GigController,
      server,
      verifyAdminWrite,
    );
    expect(verifyAdminWrite).not.toHaveBeenCalled();
    expect(transmitPublish).not.toHaveBeenCalled();
  });
  // #94: deleteGig is a mutating message — reject when the admin-write gate rejects
  // (missing/invalid token or a non-admin userType), regardless of a valid id.
  it('removeGig rejects (no-op + socketError) when verifyAdminWrite rejects for a missing/invalid token', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: vi.fn() } };
    const receiver = { value: { token: undefined, tour: { tourId: 'asdf' } } };
    const gigController = { deleteById: vi.fn(() => Promise.resolve()) };
    const verifyAdminWrite = vi.fn(() => Promise.reject(new Error('jwt must be provided')));
    await utils.removeGig(
      receiver,
      client,
      gigController as unknown as typeof GigController,
      server,
      verifyAdminWrite,
    );
    expect(gigController.deleteById).not.toHaveBeenCalled();
    expect(transmitPublish).not.toHaveBeenCalled();
    expect(client.socket.transmit).toHaveBeenCalledWith('socketError', { deleteGig: 'jwt must be provided' });
  });
  it('removeGig rejects (no-op + socketError) when verifyAdminWrite rejects for a non-admin userType', async () => {
    const transmitPublish = vi.fn();
    const server = { exchange: { transmitPublish } };
    const client = { socket: { transmit: vi.fn() } };
    const receiver = { value: { token: 'token', gig: { gigId: 'asdf' } } };
    const gigController = { deleteById: vi.fn(() => Promise.resolve()) };
    const verifyAdminWrite = vi.fn(() => Promise.reject(new Error('Not allowed to create new gig')));
    await utils.removeGig(
      receiver,
      client,
      gigController as unknown as typeof GigController,
      server,
      verifyAdminWrite,
    );
    expect(gigController.deleteById).not.toHaveBeenCalled();
    expect(client.socket.transmit).toHaveBeenCalledWith('socketError', { deleteGig: 'Not allowed to create new gig' });
  });
  it('assertCanCreateGig rejects a null/undefined user', () => {
    expect(() => utils.assertCanCreateGig(null, ['Developer'])).toThrow('Not allowed to create new gig');
  });
  it('assertCanCreateGig accepts an allowed userType', () => {
    expect(() => utils.assertCanCreateGig({ userType: 'Developer' }, ['Developer'])).not.toThrow();
  });
});
