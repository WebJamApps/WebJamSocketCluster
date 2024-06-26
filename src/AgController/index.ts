import Debug from 'debug';
import JWT from 'jsonwebtoken';
import Superagent from 'superagent';
import type socketClusterServer from 'socketcluster-server';
import TourController from '../model/tour/tour-controller';
import tourData from '../model/tour/reset-tour';
import BookController from '../model/book/book-controller';
import bookData from '../model/book/reset-book';
import mongoose from '../model/db';
import utils from './utils';

export interface IClient {
  socket:any, 
  listener: (arg0: string) => { (): any; new(): any; createConsumer: { (): any; new(): any; }; }; id: any; 
}

const debug = Debug('WebJamSocketServer:AgController');
class AgController {
  server: any;

  jwt = JWT;

  superagent = Superagent;

  clients: any[];

  tourController = TourController;

  bookController = BookController;

  constructor(server: socketClusterServer.AGServer) {
    this.server = server;
    this.clients = [];
  }

  async resetData():Promise<void> {
    const { tour } = tourData;
    const { book } = bookData;
    await utils.resetData(tour, book, this.tourController, this.bookController);
  }

  handleDisconnect(client: IClient, interval: NodeJS.Timeout):void {
    (async () => {
      let disconnect: { value: undefined; done: any; };
      const dConsumer = client.listener('disconnect').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        disconnect = await dConsumer.next();// eslint-disable-line no-await-in-loop
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
      client.socket.transmit('pulse', { number: Math.floor(Math.random() * 5) });
    }, 1000);
    debug(`num clients: ${this.clients.length}`);
    client.socket.transmit('num_clients', this.clients.length);
    this.server.exchange.transmitPublish('sample', this.clients.length);
    return this.handleDisconnect(client.socket, interval);
  }

  async sendTours(client:IClient):Promise<string> {
    let allTours: any;
    try { allTours = await this.tourController.getAllSort({ datetime: -1 }); } catch (e) {
      const eMessage = (e as Error).message;
      debug(eMessage); 
      return eMessage; 
    }
    client.socket.transmit('allTours', allTours);
    return 'sent tours';
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
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received initial message: ${receiver.value}`);
        if (receiver.value === 123) {
          await this.sendTours(client);// eslint-disable-line no-await-in-loop
          await this.sendBooks(client);// eslint-disable-line no-await-in-loop
        } else break;
        /* istanbul ignore else */if (receiver.done) break;
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
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received newImage message: ${JSON.stringify(receiver.value)}`);
        if (!receiver.value) break;
        if (typeof receiver.value.token === 'string'
            && typeof receiver.value.image.title === 'string' && typeof receiver.value.image.url === 'string'
        ) {
          await this.handleImage('createDocs', receiver.value.image, 'imageCreated');// eslint-disable-line no-await-in-loop
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
      // eslint-disable-next-line @typescript-eslint/naming-convention
      _id, title, url, comments, 
    } = editPic;
    let r: any;// eslint-disable-next-line security/detect-object-injection
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
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received deleteImage message: ${JSON.stringify(receiver.value)}`);
        if (!receiver.value) break;
        if (typeof receiver.value.token === 'string' && typeof receiver.value.data === 'string') {
          await this.handleImage('deleteById', receiver.value.data, 'imageDeleted');// eslint-disable-line no-await-in-loop
        }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  newTour(client: IClient):void {
    (async () => {
      let receiver: { value: { token: string; 
        tour: { datetime: Date; venue: string; city:string, usState: string }; }; done: any; };
      const rConsumer = client.socket.receiver('newTour').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        let decoded, user, goodRoles;
        if (!receiver.value) break;
        try {
          decoded = this.jwt.verify(receiver.value.token, process.env.HashString || /* istanbul ignore next */'');
          user = await this.superagent.get(`${process.env.BackendUrl}/user/${decoded.sub}`) // eslint-disable-line no-await-in-loop
            .set('Accept', 'application/json').set('Authorization', `Bearer ${receiver.value.token}`);
          goodRoles = JSON.parse(process.env.userRoles || /* istanbul ignore next */'{}').roles;
          if (!goodRoles || !user || !user.body || !user.body.userType || goodRoles.indexOf(user.body.userType) === -1) { 
            throw new Error('Not allowed to create new tour');
          }
          if (receiver.value.tour.datetime && receiver.value.tour.city 
            && receiver.value.tour.usState && receiver.value.tour.venue) {
            await utils.handleTour(// eslint-disable-line no-await-in-loop
              'createDocs', 
              receiver.value.tour,
              'tourCreated', 
              this.tourController, 
              this.server,
            );
          } else throw new Error('Invalid create gig data');
          if (receiver.done) break;
        } catch (e) {
          const eMessage = (e as Error).message;
          debug(eMessage); 
          client.socket.transmit('socketError', { newTour: eMessage });// send error back to client
          break; 
        } 
      }
    })();
  }

  removeTour(client:IClient):void {
    (async () => {
      let receiver: { value: { tour:any; token: any; }; done: any; };
      const rConsumer = client.socket.receiver('deleteTour').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received deleteTour message: ${JSON.stringify(receiver.value)}`);
        if (!receiver.value) break;
        await utils.removeTour(receiver, client, this.tourController, this.server);// eslint-disable-line no-await-in-loop
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  async updateTour(
    data: { tourId: mongoose.Types.ObjectId; tour: Record<string, unknown>; },
  ):Promise<string> {
    let r: any;// eslint-disable-next-line security/detect-object-injection
    try { 
      const { tourId, tour } = data;
      if (!tour.venue || !tour.datetime || !tour.city || !tour.usState) throw new Error('Invalid gig data');
      r = await this.tourController.findByIdAndUpdate(tourId, tour); 
    } catch (e) {
      const eMessage = (e as Error).message;
      debug(eMessage); 
      return eMessage;
    }
    this.server.exchange.transmitPublish('tourUpdated', r);
    return 'Gig updated';
  }

  editDoc(client:IClient, action:string):void {
    (async () => {
      let receiver: { value:any; done: any; };
      const rConsumer = client.socket.receiver(action).createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        const obj = JSON.stringify(receiver.value);
        debug(`received ${action} message: ${obj}`);
        if (!receiver.value) break;
        if (typeof receiver.value.token === 'string') {
          // eslint-disable-next-line security/detect-object-injection
          if (action === 'editTour') await this.updateTour(receiver.value);// eslint-disable-line no-await-in-loop
          // eslint-disable-next-line no-await-in-loop
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
    this.newTour(client);
    this.removeTour(client);
    this.editDoc(client, 'editTour');
    this.newImage(client);
    this.editDoc(client, 'editImage');
    this.removeImage(client);
  }
}
export default AgController;
