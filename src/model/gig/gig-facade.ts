import Model from '../../lib/facade.js';
import gigSchema from './gig-schema.js';
import type { IGig, QueryFilter, SortOrder } from '../../types/index.js';

const venuePopulateFields = 'name address city usState website';

class GigModel extends Model<IGig> {
  async find(query: QueryFilter): Promise<IGig[]> {
    let result: IGig[];
    try {
      result = await this.Schema.find(query).populate('venueId', venuePopulateFields).lean().exec();
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve(result);
  }

  async findSort(query: QueryFilter, sort: SortOrder): Promise<IGig[]> {
    let result: IGig[];
    try {
      result = await this.Schema.find(query)
        .sort(sort as Record<string, 1 | -1>)
        .populate('venueId', venuePopulateFields)
        .lean()
        .exec();
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve(result);
  }
}

export default new GigModel(gigSchema);
