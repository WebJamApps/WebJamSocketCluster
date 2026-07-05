import Debug from 'debug';
import gigData from '../model/gig/reset-gig.js';
import jamPicsData from '../model/jamPics/reset-jamPics.js';
import GigController from '../model/gig/gig-controller.js';
import JamPicsController from '../model/jamPics/jamPics-controller.js';

const debug = Debug('WebJamSocketServer:AgController/utils');

async function resetData(
  gig: typeof gigData['gig'],
  jamPics: typeof jamPicsData['jamPics'],
  gigController: typeof GigController,
  jamPicsController: typeof JamPicsController,
) {
  try {
    await gigController.deleteAllDocs();
    await gigController.createDocs(gig);
    await jamPicsController.deleteAllDocs();
    await jamPicsController.createDocs(jamPics);
    return true;
  } catch (e) {
    const eMessage = (e as Error).message;
    debug(eMessage);
    return false;
  }
}

async function handleGig(
  func: string,
  data: any,
  message: string,
  gigController:any,
  server:any,
):Promise<void> {
  // eslint-disable-next-line security/detect-object-injection
  const r = await (gigController)[func](data);
  server.exchange.transmitPublish(message, r);
}

// #94: gate the actual deletion behind an admin-verified write. `verifyAdminWrite`
// is injected from AgController (it owns the jwt + BackendUrl role check) so this
// module keeps zero duplicate auth logic.
async function removeGig(
  receiver:any,
  client:any,
  gigController:any,
  server:any,
  verifyAdminWrite: (token: string) => Promise<void>,
) {
  try {
    // Tolerate both the new { gig: { gigId } } and the legacy { tour: { tourId } } payloads.
    const payload = receiver.value.gig ?? receiver.value.tour;
    const id = payload?.gigId ?? payload?.tourId;
    if (typeof id !== 'string') return;
    await verifyAdminWrite(receiver.value.token);
    await handleGig('deleteById', id, 'gigDeleted', gigController, server);
  } catch (e) {
    const eMessage = (e as Error).message;
    client.socket.transmit('socketError', { deleteGig: eMessage });// send error back to client
    debug(eMessage);
  }
}

function assertCanCreateGig(
  user: { userType?: string; privileges?: string[] } | null | undefined,
  goodRoles: string[] | undefined,
): void {
  if (!user) throw new Error('Not allowed to create new gig');
  if (Array.isArray(user.privileges) && user.privileges.length > 0) {
    // Accept the new gig:create and the legacy tour:create during the rename migration.
    if (!user.privileges.includes('gig:create') && !user.privileges.includes('tour:create')) {
      throw new Error('missing capability gig:create');
    }
    return;
  }
  if (!goodRoles || !user.userType || goodRoles.indexOf(user.userType) === -1) {
    throw new Error('Not allowed to create new gig');
  }
}

export default {
  resetData, removeGig, handleGig, assertCanCreateGig,
};
