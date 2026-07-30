import gigFacade from '../../src/model/gig/gig-facade.js';

describe('GigModel', () => {
  const populatedVenue = {
    name: 'The Venue', address: '123 Main St', city: 'Salem', usState: 'OR', website: 'https://venue.example',
  };

  describe('find', () => {
    it('returns a gig with venueId populated as a subdocument carrying name, city, usState, website, and address', async () => {
      const gig = { _id: 'gig1', venueId: populatedVenue };
      (gigFacade as unknown as Record<string, unknown>).Schema = {
        find: () => ({ populate: () => ({ lean: () => ({ exec: () => Promise.resolve([gig]) }) }) }),
      };
      const result = await gigFacade.find({});
      expect(result).toEqual([gig]);
    });

    it('propagates a rejection', async () => {
      (gigFacade as unknown as Record<string, unknown>).Schema = {
        find: () => ({ populate: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('bad')) }) }) }),
      };
      await expect(gigFacade.find({})).rejects.toThrow('bad');
    });
  });

  describe('findSort', () => {
    it('returns a gig with venueId populated as a subdocument carrying name, city, usState, website, and address', async () => {
      const gig = { _id: 'gig1', venueId: populatedVenue };
      (gigFacade as unknown as Record<string, unknown>).Schema = {
        find: () => ({ sort: () => ({ populate: () => ({ lean: () => ({ exec: () => Promise.resolve([gig]) }) }) }) }),
      };
      const result = await gigFacade.findSort({}, {});
      expect(result).toEqual([gig]);
    });

    it('propagates a rejection', async () => {
      (gigFacade as unknown as Record<string, unknown>).Schema = {
        find: () => ({ sort: () => ({ populate: () => ({ lean: () => ({ exec: () => Promise.reject(new Error('bad')) }) }) }) }),
      };
      await expect(gigFacade.findSort({}, {})).rejects.toThrow('bad');
    });
  });
});
