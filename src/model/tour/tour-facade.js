const Model = require('../../lib/facade');
const tourSchema = require('./tour-schema');

class TourModel extends Model {

}

module.exports = new TourModel(tourSchema);
