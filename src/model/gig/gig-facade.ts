import Model from '../../lib/facade.js';
import gigSchema from './gig-schema.js';

const venuePopulateFields = 'name address city usState website';

class GigModel extends Model {
  async find(query: any): Promise<any> {
    let result;
    try {
      result = await this.Schema.find(query).populate('venueId', venuePopulateFields).lean().exec();
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve(result);
  }

  async findSort(query: any, sort: any): Promise<any> {
    let result;
    try {
      result = await this.Schema.find(query).sort(sort).populate('venueId', venuePopulateFields).lean().exec();
    } catch (e) {
      return Promise.reject(e);
    }
    return Promise.resolve(result);
  }
}

export default new GigModel(gigSchema);
