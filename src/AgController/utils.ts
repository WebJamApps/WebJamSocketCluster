import Debug from 'debug';
import gigData from '../model/gig/reset-gig.js';
import jamPicsData from '../model/jamPics/reset-jamPics.js';
import GigController from '../model/gig/gig-controller.js';
import JamPicsController from '../model/jamPics/jamPics-controller.js';
import type { IClient, IRemoveGigPayload, ISocketExchange, IUser } from '../types/index.js';

const debug = Debug('WebJamSocketServer:AgController/utils');

async function getDocCount(controller: unknown): Promise<number> {
  const c = controller as {
    countDocuments?: () => Promise<number>;
    count?: () => Promise<number>;
    model?: { Schema?: { countDocuments: () => { exec?: () => Promise<number> } | Promise<number> } };
    getAll?: () => Promise<unknown[]>;
  };
  if (typeof c.countDocuments === 'function') {
    return c.countDocuments();
  }
  if (typeof c.count === 'function') {
    return c.count();
  }
  if (typeof c.model?.Schema?.countDocuments === 'function') {
    const query = c.model.Schema.countDocuments();
    if (query && typeof (query as { exec?: () => Promise<number> }).exec === 'function') {
      return (query as { exec: () => Promise<number> }).exec();
    }
    return query as Promise<number>;
  }
  if (typeof c.getAll === 'function') {
    const docs = await c.getAll();
    return docs.length;
  }
  throw new Error('Unable to determine collection count');
}

async function resetData(
  gig: typeof gigData['gig'],
  jamPics: typeof jamPicsData['jamPics'],
  gigController: typeof GigController,
  jamPicsController: typeof JamPicsController,
) {
  try {
    const gigCount = await getDocCount(gigController);
    const jamPicsCount = await getDocCount(jamPicsController);
    if (gigCount === 0) {
      await gigController.createDocs(gig);
    }
    if (jamPicsCount === 0) {
      await jamPicsController.createDocs(jamPics);
    }
    return true;
  } catch (e) {
    const eMessage = (e as Error).message;
    debug(eMessage);
    return false;
  }
}

async function handleGig(
  func: 'deleteById' | 'createDocs' | 'updateGig' | 'createGig',
  data: unknown,
  message: string,
  gigController: typeof GigController,
  server: { exchange: ISocketExchange },
): Promise<void> {
  // eslint-disable-next-line security/detect-object-injection
  const r = await (gigController as unknown as Record<string, (d: unknown) => Promise<unknown>>)[func](data);
  server.exchange.transmitPublish(message, r);
}

// #94: gate the actual deletion behind an admin-verified write. `verifyAdminWrite`
// is injected from AgController (it owns the jwt + BackendUrl role check) so this
// module keeps zero duplicate auth logic.
async function removeGig(
  receiver: { value: IRemoveGigPayload },
  client: IClient,
  gigController: typeof GigController,
  server: { exchange: ISocketExchange },
  verifyAdminWrite: (token: string) => Promise<void>,
) {
  try {
    // Tolerate both the new { gig: { gigId } } and the legacy { tour: { tourId } } payloads.
    const payload = receiver.value.gig ?? receiver.value.tour;
    const id = payload?.gigId ?? payload?.tourId;
    if (typeof id !== 'string') return;
    await verifyAdminWrite(receiver.value.token ?? '');
    await handleGig('deleteById', id, 'gigDeleted', gigController, server);
  } catch (e) {
    const eMessage = (e as Error).message;
    client.socket?.transmit?.('socketError', { deleteGig: eMessage });// send error back to client
    debug(eMessage);
  }
}

function assertCanCreateGig(
  user: IUser | null | undefined,
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
  if (!goodRoles || !user.userType || !goodRoles.includes(user.userType)) {
    throw new Error('Not allowed to create new gig');
  }
}

export default {
  resetData, removeGig, handleGig, assertCanCreateGig,
};
