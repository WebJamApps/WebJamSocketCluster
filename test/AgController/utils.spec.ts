import utils from '#src/AgController/utils.js';
import type GigController from '#src/model/gig/gig-controller.js';
import type JamPicsController from '#src/model/jamPics/jamPics-controller.js';

describe('AgController/utils', () => {
  describe('resetData', () => {
    const sampleGigs = [{ title: 'gig 1' }] as never;
    const samplePics = [{ url: 'pic 1' }] as never;

    it('seeds gigs and pictures into empty collections (zero records) and does not call any delete', async () => {
      const gigCreateDocs = vi.fn(() => Promise.resolve());
      const gigDeleteAllDocs = vi.fn();
      const gigDeleteMany = vi.fn();
      const fakeGigController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: gigCreateDocs,
        deleteAllDocs: gigDeleteAllDocs,
        deleteMany: gigDeleteMany,
      };

      const jamPicsCreateDocs = vi.fn(() => Promise.resolve());
      const jamPicsDeleteAllDocs = vi.fn();
      const jamPicsDeleteMany = vi.fn();
      const fakeJamPicsController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: jamPicsCreateDocs,
        deleteAllDocs: jamPicsDeleteAllDocs,
        deleteMany: jamPicsDeleteMany,
      };

      const result = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigController as unknown as typeof GigController,
        fakeJamPicsController as unknown as typeof JamPicsController,
      );

      expect(result).toBe(true);
      expect(gigCreateDocs).toHaveBeenCalledWith(sampleGigs);
      expect(jamPicsCreateDocs).toHaveBeenCalledWith(samplePics);
      expect(gigDeleteAllDocs).not.toHaveBeenCalled();
      expect(gigDeleteMany).not.toHaveBeenCalled();
      expect(jamPicsDeleteAllDocs).not.toHaveBeenCalled();
      expect(jamPicsDeleteMany).not.toHaveBeenCalled();
    });

    it('leaves collections holding one record exactly as they are and does not call any delete', async () => {
      const gigCreateDocs = vi.fn();
      const gigDeleteAllDocs = vi.fn();
      const fakeGigController = {
        countDocuments: vi.fn(() => Promise.resolve(1)),
        createDocs: gigCreateDocs,
        deleteAllDocs: gigDeleteAllDocs,
      };

      const jamPicsCreateDocs = vi.fn();
      const jamPicsDeleteAllDocs = vi.fn();
      const fakeJamPicsController = {
        countDocuments: vi.fn(() => Promise.resolve(1)),
        createDocs: jamPicsCreateDocs,
        deleteAllDocs: jamPicsDeleteAllDocs,
      };

      const result = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigController as unknown as typeof GigController,
        fakeJamPicsController as unknown as typeof JamPicsController,
      );

      expect(result).toBe(true);
      expect(gigCreateDocs).not.toHaveBeenCalled();
      expect(jamPicsCreateDocs).not.toHaveBeenCalled();
      expect(gigDeleteAllDocs).not.toHaveBeenCalled();
      expect(jamPicsDeleteAllDocs).not.toHaveBeenCalled();
    });

    it('seeds only gigs when gigs is empty and jamPics holds one record', async () => {
      const gigCreateDocs = vi.fn(() => Promise.resolve());
      const gigDeleteAllDocs = vi.fn();
      const fakeGigController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: gigCreateDocs,
        deleteAllDocs: gigDeleteAllDocs,
      };

      const jamPicsCreateDocs = vi.fn();
      const jamPicsDeleteAllDocs = vi.fn();
      const fakeJamPicsController = {
        countDocuments: vi.fn(() => Promise.resolve(1)),
        createDocs: jamPicsCreateDocs,
        deleteAllDocs: jamPicsDeleteAllDocs,
      };

      const result = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigController as unknown as typeof GigController,
        fakeJamPicsController as unknown as typeof JamPicsController,
      );

      expect(result).toBe(true);
      expect(gigCreateDocs).toHaveBeenCalledWith(sampleGigs);
      expect(jamPicsCreateDocs).not.toHaveBeenCalled();
      expect(gigDeleteAllDocs).not.toHaveBeenCalled();
      expect(jamPicsDeleteAllDocs).not.toHaveBeenCalled();
    });

    it('seeds only jamPics when jamPics is empty and gigs holds one record', async () => {
      const gigCreateDocs = vi.fn();
      const gigDeleteAllDocs = vi.fn();
      const fakeGigController = {
        countDocuments: vi.fn(() => Promise.resolve(1)),
        createDocs: gigCreateDocs,
        deleteAllDocs: gigDeleteAllDocs,
      };

      const jamPicsCreateDocs = vi.fn(() => Promise.resolve());
      const jamPicsDeleteAllDocs = vi.fn();
      const fakeJamPicsController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: jamPicsCreateDocs,
        deleteAllDocs: jamPicsDeleteAllDocs,
      };

      const result = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigController as unknown as typeof GigController,
        fakeJamPicsController as unknown as typeof JamPicsController,
      );

      expect(result).toBe(true);
      expect(gigCreateDocs).not.toHaveBeenCalled();
      expect(jamPicsCreateDocs).toHaveBeenCalledWith(samplePics);
      expect(gigDeleteAllDocs).not.toHaveBeenCalled();
      expect(jamPicsDeleteAllDocs).not.toHaveBeenCalled();
    });

    it('seeds nothing and deletes nothing when determining gigs count throws', async () => {
      const gigCreateDocs = vi.fn();
      const gigDeleteAllDocs = vi.fn();
      const fakeGigController = {
        countDocuments: vi.fn(() => Promise.reject(new Error('gigs count failed'))),
        createDocs: gigCreateDocs,
        deleteAllDocs: gigDeleteAllDocs,
      };

      const jamPicsCreateDocs = vi.fn();
      const jamPicsDeleteAllDocs = vi.fn();
      const fakeJamPicsController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: jamPicsCreateDocs,
        deleteAllDocs: jamPicsDeleteAllDocs,
      };

      const result = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigController as unknown as typeof GigController,
        fakeJamPicsController as unknown as typeof JamPicsController,
      );

      expect(result).toBe(false);
      expect(gigCreateDocs).not.toHaveBeenCalled();
      expect(jamPicsCreateDocs).not.toHaveBeenCalled();
      expect(gigDeleteAllDocs).not.toHaveBeenCalled();
      expect(jamPicsDeleteAllDocs).not.toHaveBeenCalled();
    });

    it('seeds nothing and deletes nothing when determining jamPics count throws', async () => {
      const gigCreateDocs = vi.fn();
      const gigDeleteAllDocs = vi.fn();
      const fakeGigController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: gigCreateDocs,
        deleteAllDocs: gigDeleteAllDocs,
      };

      const jamPicsCreateDocs = vi.fn();
      const jamPicsDeleteAllDocs = vi.fn();
      const fakeJamPicsController = {
        countDocuments: vi.fn(() => Promise.reject(new Error('jamPics count failed'))),
        createDocs: jamPicsCreateDocs,
        deleteAllDocs: jamPicsDeleteAllDocs,
      };

      const result = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigController as unknown as typeof GigController,
        fakeJamPicsController as unknown as typeof JamPicsController,
      );

      expect(result).toBe(false);
      expect(gigCreateDocs).not.toHaveBeenCalled();
      expect(jamPicsCreateDocs).not.toHaveBeenCalled();
      expect(gigDeleteAllDocs).not.toHaveBeenCalled();
      expect(jamPicsDeleteAllDocs).not.toHaveBeenCalled();
    });

    it('catches error and returns false when createDocs throws without deleting', async () => {
      const gigCreateDocs = vi.fn(() => Promise.reject(new Error('insert failed')));
      const gigDeleteAllDocs = vi.fn();
      const fakeGigController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: gigCreateDocs,
        deleteAllDocs: gigDeleteAllDocs,
      };

      const fakeJamPicsController = {
        countDocuments: vi.fn(() => Promise.resolve(0)),
        createDocs: vi.fn(() => Promise.resolve()),
        deleteAllDocs: vi.fn(),
      };

      const result = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigController as unknown as typeof GigController,
        fakeJamPicsController as unknown as typeof JamPicsController,
      );

      expect(result).toBe(false);
      expect(gigDeleteAllDocs).not.toHaveBeenCalled();
    });

    it('supports alternative count methods (count, model.Schema.countDocuments, getAll)', async () => {
      const fakeGigWithCount = {
        count: vi.fn(() => Promise.resolve(0)),
        createDocs: vi.fn(() => Promise.resolve()),
      };
      const fakeJamWithModel = {
        model: { Schema: { countDocuments: vi.fn(() => ({ exec: () => Promise.resolve(0) })) } },
        createDocs: vi.fn(() => Promise.resolve()),
      };

      const r1 = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeGigWithCount as unknown as typeof GigController,
        fakeJamWithModel as unknown as typeof JamPicsController,
      );
      expect(r1).toBe(true);
      expect(fakeGigWithCount.createDocs).toHaveBeenCalled();
      expect(fakeJamWithModel.createDocs).toHaveBeenCalled();

      const fakeWithGetAll = {
        getAll: vi.fn(() => Promise.resolve([])),
        createDocs: vi.fn(() => Promise.resolve()),
      };
      const fakeWithDirectPromiseModel = {
        model: { Schema: { countDocuments: vi.fn(() => Promise.resolve(0)) } },
        createDocs: vi.fn(() => Promise.resolve()),
      };
      const r2 = await utils.resetData(
        sampleGigs,
        samplePics,
        fakeWithGetAll as unknown as typeof GigController,
        fakeWithDirectPromiseModel as unknown as typeof JamPicsController,
      );
      expect(r2).toBe(true);

      const uncountble = {};
      const r3 = await utils.resetData(
        sampleGigs,
        samplePics,
        uncountble as unknown as typeof GigController,
        uncountble as unknown as typeof JamPicsController,
      );
      expect(r3).toBe(false);
    });
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
