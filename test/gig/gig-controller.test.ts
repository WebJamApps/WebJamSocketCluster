import mongoose from 'mongoose';
import controller, { DEFAULT_ARTIST } from '../../src/model/gig/gig-controller.js';
import type { IGig, QueryFilter } from '../../src/types/index.js';

describe('GigController', () => {
  const testId = new mongoose.Types.ObjectId();
  it('deletes all tours', async () => {
    controller.model.deleteMany = vi.fn(() => Promise.resolve(true));
    const result = await controller.deleteAllDocs();
    expect(result).toBe(true);
  });
  it('throws error on deletes all tours', async () => {
    controller.model.deleteMany = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.deleteAllDocs()).rejects.toThrow('bad');
  });
  it('throws error on make one tour', async () => {
    controller.model.create = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.createDocs({})).rejects.toThrow('bad');
  });
  it('handles error on gets all tours sorted', async () => {
    controller.model.findSort = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.getAllSort({})).rejects.toThrow('bad');
  });
  it('deletes tour by id', async () => {
    controller.model.findByIdAndRemove = vi.fn(() => Promise.resolve({}));
    const result = await controller.deleteById(testId);
    expect(result).toEqual({});
  });
  it('throws error on delete by id', async () => {
    controller.model.findByIdAndRemove = vi.fn(() => Promise.reject(new Error('bad')));
    await expect(controller.deleteById(testId)).rejects.toThrow('bad');
  });
  it('detects a bad id', async () => {
    const anyId = '' as unknown as mongoose.Types.ObjectId;
    await expect(controller.deleteById(anyId)).rejects.toThrow('id is invalid');
  });
  it('fails to delete', async () => {
    controller.model.findByIdAndRemove = vi.fn(() => Promise.resolve(null));
    await expect(controller.deleteById(testId)).rejects.toThrow('Delete id not found');
  });
  it('updates a tour by id', async () => {
    controller.model.findByIdAndUpdate = vi.fn(() => Promise.resolve({}));
    const r = await controller.findByIdAndUpdate(testId, {});
    expect(r).toEqual({});
  });
  it('updates a tour by id but none found to update', async () => {
    controller.model.findByIdAndUpdate = vi.fn(() => Promise.resolve(null));
    await expect(controller.findByIdAndUpdate(testId, {})).rejects.toThrow('Id Not Found');
  });
  describe('getAllByArtistSort', () => {
    const gigJosh = { _id: '1', venue: 'Josh Gig', artist: 'josh' };
    const gigJammusic = { _id: '2', venue: 'JaMmusic Gig', artist: 'jammusic' };
    const gigMissingArtist = { _id: '3', venue: 'Missing Artist Gig' };
    const gigNullArtist = { _id: '4', venue: 'Null Artist Gig', artist: null };
    const gigTim = { _id: '5', venue: 'Tim Gig', artist: 'tim' };
    const allSampleGigs = [gigJosh, gigJammusic, gigMissingArtist, gigNullArtist, gigTim];

    const matchQuery = (query: Record<string, unknown>, doc: Record<string, unknown>): boolean => {
      if (Array.isArray(query.$or)) {
        return query.$or.some((clause: Record<string, unknown>) => {
          if ('artist' in clause) {
            const target = clause.artist;
            if (target && typeof target === 'object' && '$exists' in (target as Record<string, unknown>)) {
              return !('artist' in doc);
            }
            return doc.artist === target;
          }
          return false;
        });
      }
      if ('artist' in query) {
        return doc.artist === query.artist;
      }
      return false;
    };

    beforeEach(() => {
      controller.model.findSort = vi.fn((query: QueryFilter) => {
        const matched = allSampleGigs.filter((g) => matchQuery(query as Record<string, unknown>, g));
        return Promise.resolve(matched as unknown as IGig[]);
      });
    });

    it('builds widened $or query for the default artist including jammusic', async () => {
      const findSortMock = vi.fn(() => Promise.resolve([] as IGig[]));
      controller.model.findSort = findSortMock;
      await controller.getAllByArtistSort(DEFAULT_ARTIST, { datetime: -1 });
      expect(findSortMock).toHaveBeenCalledWith(
        {
          $or: [
            { artist: DEFAULT_ARTIST },
            { artist: 'jammusic' },
            { artist: { $exists: false } },
            { artist: null },
          ],
        },
        { datetime: -1 },
      );
    });

    it('matches josh, jammusic, missing artist, and null for default artist, and excludes tim', async () => {
      const results = await controller.getAllByArtistSort(DEFAULT_ARTIST, { datetime: -1 });
      expect(results).toContain(gigJosh);
      expect(results).toContain(gigJammusic);
      expect(results).toContain(gigMissingArtist);
      expect(results).toContain(gigNullArtist);
      expect(results).not.toContain(gigTim);
      expect(results).toHaveLength(4);
    });

    it('specifically matches a gig carrying artist: "jammusic" under the default filter', async () => {
      const results = await controller.getAllByArtistSort(DEFAULT_ARTIST, { datetime: -1 });
      const jammusicGig = results.find((g) => g.artist === 'jammusic');
      expect(jammusicGig).toBeDefined();
      expect(jammusicGig?.venue).toBe('JaMmusic Gig');
    });

    it('builds exact match query for non-default artist and returns only matching gigs', async () => {
      const results = await controller.getAllByArtistSort('tim', { datetime: -1 });
      expect(results).toEqual([gigTim]);
      expect(results).not.toContain(gigJosh);
      expect(results).not.toContain(gigJammusic);
      expect(results).not.toContain(gigMissingArtist);
      expect(results).not.toContain(gigNullArtist);
    });
  });
  it('should wait unit tests finish before exiting', async () => {
    const delay = (ms: number) => new Promise((resolve) => { setTimeout(() => resolve(true), ms); });
    await delay(1000);
  });
});
