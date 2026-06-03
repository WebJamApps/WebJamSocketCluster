import Debug from 'debug';
import JWT from 'jsonwebtoken';
import type socketClusterServer from 'socketcluster-server';
import GigController from '../model/gig/gig-controller.js';
import gigData from '../model/gig/reset-gig.js';
import BookController from '../model/book/book-controller.js';
import bookData from '../model/book/reset-book.js';
import mongoose from '../model/db.js';
import utils from './utils.js';

export interface IClient {
  socket:any,
  listener: (arg0: string) => { (): any; new(): any; createConsumer: { (): any; new(): any; }; }; id: any;
}

const debug = Debug('WebJamSocketServer:AgController');
class AgController {
  server: any;

  jwt = JWT;

  clients: any[];

  gigController = GigController;

  bookController = BookController;

  constructor(server: socketClusterServer.AGServer) {
    this.server = server;
    this.clients = [];
  }

  async resetData():Promise<void> {
    const { gig } = gigData;
    const { book } = bookData;
    await utils.resetData(gig, book, this.gigController, this.bookController);
  }

  handleDisconnect(client: IClient, interval: NodeJS.Timeout):void {
    (async () => {
      let disconnect: { value: undefined; done: any; };
      const dConsumer = client.listener('disconnect').createConsumer();
      while (true) {
        disconnect = await dConsumer.next();
        clearInterval(interval);
        if (disconnect.value !== undefined) {
          const index = this.clients.indexOf(client.id);
          if (index !== -1) this.clients.splice(index, 1);
        }
        this.server.exchange.transmitPublish('sample', this.clients.length);
        /* istanbul ignore else */if (disconnect.done) break;
      }
    })();
  }

  sendPulse(client:IClient):void {
    const interval = setInterval(() => {
      // sonarjs/pseudo-random: this is a non-security pulse heartbeat for clients
      // (an arbitrary 0-4 number transmitted every second). Math.random is fine here.
      // eslint-disable-next-line sonarjs/pseudo-random
      client.socket.transmit('pulse', { number: Math.floor(Math.random() * 5) });
    }, 1000);
    debug(`num clients: ${this.clients.length}`);
    client.socket.transmit('num_clients', this.clients.length);
    this.server.exchange.transmitPublish('sample', this.clients.length);
    return this.handleDisconnect(client.socket, interval);
  }

  async sendGigs(client:IClient):Promise<string> {
    let allGigs: any;
    try { allGigs = await this.gigController.getAllSort({ datetime: -1 }); } catch (e) {
      const eMessage = (e as Error).message;
      debug(eMessage);
      return eMessage;
    }
    client.socket.transmit('allGigs', allGigs);
    // legacy alias so any still-deployed old frontend keeps showing gigs during the rename migration
    client.socket.transmit('allTours', allGigs);
    return 'sent gigs';
  }

  async sendBooks(client: IClient):Promise<string> {
    let allBooks: any;
    try { allBooks = await this.bookController.getAll(); } catch (e) {
      const eMessage = (e as Error).message;
      debug(eMessage);
      return eMessage;
    }
    client.socket.transmit('allBooks', allBooks);
    return 'sent books';
  }

  handleReceiver(client:IClient):void {
    (async () => {
      let receiver: { value: number; done: any; };
      const rConsumer = client.socket.receiver('initial message').createConsumer();
      while (true) {
        receiver = await rConsumer.next();
        debug(`received initial message: ${receiver.value}`);
        if (receiver.value === 123) {
          await this.sendGigs(client);
          await this.sendBooks(client);
        } else {
          break;
        }
        /* istanbul ignore else */
        if (receiver.done) break;
      }
    })();
  }

  async handleImage(func: string, data: Record<string, unknown> | string, message: string):Promise<string> {
    let r: any;
    // eslint-disable-next-line security/detect-object-injection
    try { r = await (this.bookController as any)[func](data); } catch (e) {
      const eMessage = (e as Error).message;
      debug(eMessage);
      return eMessage;
    }
    this.server.exchange.transmitPublish(message, r);
    return message;
  }

  newImage(client:IClient): void {
    (async () => {
      let receiver: { value: { token: string; image: any }, done: any; };
      const rConsumer = client.socket.receiver('newImage').createConsumer();
      while (true) {
        receiver = await rConsumer.next();
        debug(`received newImage message: ${JSON.stringify(receiver.value)}`);
        if (!receiver.value) break;
        if (typeof receiver.value.token === 'string'
            && typeof receiver.value.image.title === 'string' && typeof receiver.value.image.url === 'string'
        ) {
          await this.handleImage('createDocs', receiver.value.image, 'imageCreated');
        }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  async updateImage(
    data: { token:string;
      editPic: { _id: mongoose.Types.ObjectId, title:string, url:string, comments:string }; },
    client:IClient,
  ):Promise<string> {
    const { editPic, token } = data;
    const {

      _id, title, url, comments,
    } = editPic;
    let r: any;
    if (typeof token !== 'string') throw new Error('invalid token');
    try { r = await this.bookController.findByIdAndUpdate(_id, { title, url, comments }); } catch (e) {
      const eMessage = (e as Error).message;
      client.socket.transmit('socketError', { updateImage: eMessage });// send error back to client
      debug(eMessage);
      return eMessage;
    }
    this.server.exchange.transmitPublish('imageUpdated', r);
    return 'image updated';
  }

  removeImage(client:IClient):void {
    (async () => {
      let receiver: { value: { data: string; token: string; }; done: any; };
      const rConsumer = client.socket.receiver('deleteImage').createConsumer();
      while (true) {
        receiver = await rConsumer.next();
        debug(`received deleteImage message: ${JSON.stringify(receiver.value)}`);
        if (!receiver.value) break;
        if (typeof receiver.value.token === 'string' && typeof receiver.value.data === 'string') {
          await this.handleImage('deleteById', receiver.value.data, 'imageDeleted');
        }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  // Listens on `messageName` ('newGig' and, during migration, legacy 'newTour').
  // Tolerates both the new { gig } and legacy { tour } payload shapes.
  newGig(client: IClient, messageName: string):void {
    (async () => {
      let receiver: { value: any; done: any; };
      const rConsumer = client.socket.receiver(messageName).createConsumer();
      while (true) {
        receiver = await rConsumer.next();
        let decoded, user, goodRoles;
        if (!receiver.value) break;
        try {
          const gig = receiver.value.gig ?? receiver.value.tour;
          decoded = this.jwt.verify(receiver.value.token, process.env.HashString || /* istanbul ignore next */'');
          const userRes = await fetch(`${process.env.BackendUrl}/user/${decoded.sub}`, {
            headers: { Accept: 'application/json', Authorization: `Bearer ${receiver.value.token}` },
          });
          if (!userRes.ok) throw new Error(`${userRes.status} ${userRes.statusText}`);
          user = await userRes.json();
          goodRoles = JSON.parse(process.env.userRoles || /* istanbul ignore next */'{}').roles;
          utils.assertCanCreateGig(user, goodRoles);
          if (gig && gig.datetime && gig.city && gig.usState && gig.venue) {
            await utils.handleGig('createDocs', gig, 'gigCreated', this.gigController, this.server);
          } else throw new Error('Invalid create gig data');
          if (receiver.done) break;
        } catch (e) {
          const eMessage = (e as Error).message;
          debug(eMessage);
          client.socket.transmit('socketError', { newGig: eMessage });// send error back to client
          break;
        }
      }
    })();
  }

  // Listens on `messageName` ('deleteGig' and, during migration, legacy 'deleteTour').
  removeGig(client:IClient, messageName: string):void {
    (async () => {
      let receiver: { value: { gig?:any; tour?:any; token: any; }; done: any; };
      const rConsumer = client.socket.receiver(messageName).createConsumer();
      while (true) {
        receiver = await rConsumer.next();
        debug(`received ${messageName} message: ${JSON.stringify(receiver.value)}`);
        if (!receiver.value) break;
        await utils.removeGig(receiver, client, this.gigController, this.server);
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  async updateGig(
    data: { gigId?: any; tourId?: any;
      gig?: Record<string, unknown>; tour?: Record<string, unknown>; },
  ):Promise<string> {
    let r: any;
    try {
      const id = data.gigId ?? data.tourId;
      const gig = data.gig ?? data.tour ?? {};
      if (!gig.venue || !gig.datetime || !gig.city || !gig.usState) throw new Error('Invalid gig data');
      r = await this.gigController.findByIdAndUpdate(id, gig);
    } catch (e) {
      const eMessage = (e as Error).message;
      debug(eMessage);
      return eMessage;
    }
    this.server.exchange.transmitPublish('gigUpdated', r);
    return 'Gig updated';
  }

  editDoc(client:IClient, action:string):void {
    (async () => {
      let receiver: { value:any; done: any; };
      const rConsumer = client.socket.receiver(action).createConsumer();
      while (true) {
        receiver = await rConsumer.next();
        const obj = JSON.stringify(receiver.value);
        debug(`received ${action} message: ${obj}`);
        if (!receiver.value) break;
        if (typeof receiver.value.token === 'string') {

          if (action === 'editGig' || action === 'editTour') await this.updateGig(receiver.value);

          else await this.updateImage(receiver.value, client);
        }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  addSocket(client:IClient): void {
    this.clients.push(client.id);
    debug('clientIds');
    debug(this.clients);
    this.handleReceiver(client);
    this.sendPulse(client);
    this.newGig(client, 'newGig');
    this.newGig(client, 'newTour'); // legacy alias during migration
    this.removeGig(client, 'deleteGig');
    this.removeGig(client, 'deleteTour'); // legacy alias during migration
    this.editDoc(client, 'editGig');
    this.editDoc(client, 'editTour'); // legacy alias during migration
    this.newImage(client);
    this.editDoc(client, 'editImage');
    this.removeImage(client);
  }
}
export default AgController;
