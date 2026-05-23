import Debug from 'debug';
import tourData from '../model/tour/reset-tour.js';
import bookData from '../model/book/reset-book.js';
import TourController from '../model/tour/tour-controller.js';
import BookController from '../model/book/book-controller.js';

const debug = Debug('WebJamSocketServer:AgController/utils');

async function resetData(
  tour: typeof tourData['tour'],
  book: typeof bookData['book'],
  tourController: typeof TourController,
  bookController: typeof BookController,
) {
  try {
    await tourController.deleteAllDocs();
    await tourController.createDocs(tour);
    await bookController.deleteAllDocs();
    await bookController.createDocs(book);
    return true;
  } catch (e) {
    const eMessage = (e as Error).message;
    debug(eMessage); 
    return false;
  }
}

async function handleTour(
  func: string, 
  data: { datetime: Date; venue: string; city:string, usState:string }, 
  message: string,
  tourController:any,
  server:any,
):Promise<void> {
  // eslint-disable-next-line security/detect-object-injection
  const r = await (tourController)[func](data);
  server.exchange.transmitPublish(message, r);
}

async function removeTour(receiver:any, client:any, tourController:any, server:any) {
  try {
    if (typeof receiver.value.tour.tourId === 'string' && typeof receiver.value.token === 'string') {
      await handleTour('deleteById', receiver.value.tour.tourId, 'tourDeleted', tourController, server); 
    }
  } catch (e) { 
    const eMessage = (e as Error).message;
    client.socket.transmit('socketError', { deleteTour: eMessage });// send error back to client
    debug(eMessage); 
  }
}

function assertCanCreateTour(
  user: { userType?: string; privileges?: string[] } | null | undefined,
  goodRoles: string[] | undefined,
): void {
  if (!user) throw new Error('Not allowed to create new tour');
  if (Array.isArray(user.privileges) && user.privileges.length > 0) {
    if (!user.privileges.includes('tour:create')) throw new Error('missing capability tour:create');
    return;
  }
  if (!goodRoles || !user.userType || goodRoles.indexOf(user.userType) === -1) {
    throw new Error('Not allowed to create new tour');
  }
}

export default {
  resetData, removeTour, handleTour, assertCanCreateTour,
};
