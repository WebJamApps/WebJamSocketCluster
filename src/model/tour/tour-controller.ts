import Controller from '../../lib/controller.js';
import tourModel from './tour-facade.js';

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
