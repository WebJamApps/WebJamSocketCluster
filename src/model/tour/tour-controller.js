// const debug = require('debug')('WebJamSocketServer:tour-controller');
const Controller = require('../../lib/controller');
const tourModel = require('./tour-facade');

class TourController extends Controller {
  // async createTour(body) {
  //   let result;
  //   try { result = await this.model.create(body); } catch (e) {
  //     debug(e.message); throw e;
  //   } debug(result);
  //   return Promise.resolve(true);
  // }
}

module.exports = new TourController(tourModel);
