// const debug = require('debug')('WebJamSocketServer:tour-controller');
import Controller from '../../lib/controller';
import tourModel from './tour-facade';

class TourController extends Controller {
  // async createTour(body) {
  //   let result;
  //   try { result = await this.model.create(body); } catch (e) {
  //     debug(e.message); throw e;
  //   } debug(result);
  //   return Promise.resolve(true);
  // }
}

export default new TourController(tourModel);
