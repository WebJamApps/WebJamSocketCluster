import Controller from '../../lib/controller.js';
import jamPicsModel from './jamPics-facade.js';
import type { IJamPic } from '../../types/index.js';

class JamPicsController extends Controller<IJamPic> {
}

export default new JamPicsController(jamPicsModel);
