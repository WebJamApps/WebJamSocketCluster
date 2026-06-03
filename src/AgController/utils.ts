import Debug from 'debug';
import gigData from '../model/gig/reset-gig.js';
import bookData from '../model/book/reset-book.js';
import GigController from '../model/gig/gig-controller.js';
import BookController from '../model/book/book-controller.js';

const debug = Debug('WebJamSocketServer:AgController/utils');

async function resetData(
  gig: typeof gigData['gig'],
  book: typeof bookData['book'],
  gigController: typeof GigController,
  bookController: typeof BookController,
) {
  try {
    await gigController.deleteAllDocs();
    await gigController.createDocs(gig);
    await bookController.deleteAllDocs();
    await bookController.createDocs(book);
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

async function removeGig(receiver:any, client:any, gigController:any, server:any) {
  try {
    // Tolerate both the new { gig: { gigId } } and the legacy { tour: { tourId } } payloads.
    const payload = receiver.value.gig ?? receiver.value.tour;
    const id = payload?.gigId ?? payload?.tourId;
    if (typeof id === 'string' && typeof receiver.value.token === 'string') {
      await handleGig('deleteById', id, 'gigDeleted', gigController, server);
    }
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
