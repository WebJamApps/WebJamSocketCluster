import Model from '#lib/facade.js';
import jamPicsSchema from './jamPics-schema.js';
import type { IJamPic } from '../../types/index.js';

class JamPicsModel extends Model<IJamPic> {

}
export default new JamPicsModel(jamPicsSchema);
