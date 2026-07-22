import Model from '../../lib/facade.js';
import gigSchema from './gig-schema.js';

class GigModel extends Model {
  async find(query: any): Promise<any> {
    let result;
    try { result = await this.Schema.find(query).populate('venueId', 'name city usState website').lean().exec(); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(result);
  }

  async findSort(query: any, sort: any): Promise<any> {
    let result;
    try { result = await this.Schema.find(query).sort(sort).populate('venueId', 'name city usState website').lean().exec(); } catch (e) { return Promise.reject(e); }
    return Promise.resolve(result);
  }
}

export default new GigModel(gigSchema);
