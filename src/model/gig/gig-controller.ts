import Controller from '../../lib/controller.js';
import gigModel from './gig-facade.js';

// Default/back-compat artist (#237). Pre-#237 gigs predate the `artist` field
// entirely, so treating undefined/null as the default artist keeps the live
// JaMmusic site working on both sides of the wj-prod -> web-jam-data Mongo
// repoint (before: no artist field at all; after: artist:"josh").
export const DEFAULT_ARTIST = 'josh';

class GigController extends Controller {
  // Scope gigs to an artist. The default artist also matches legacy docs
  // that have no `artist` field (or it's null) — see DEFAULT_ARTIST above.
  // Non-default artists (e.g. "tim") match exactly.
  async getAllByArtistSort(artist: string, sort: any): Promise<any> {
    const query = artist === DEFAULT_ARTIST
      ? { $or: [{ artist: DEFAULT_ARTIST }, { artist: { $exists: false } }, { artist: null }] }
      : { artist };
    return this.getAllSort(sort, query);
  }
}

export default new GigController(gigModel);
