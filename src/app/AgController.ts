/* eslint-disable @typescript-eslint/no-explicit-any */
import Debug from 'debug';
import TourController from '../model/tour/tour-controller';
import tourData from '../model/tour/reset-tour';
import BookController from '../model/book/book-controller';
import bookData from '../model/book/reset-book';

const debug = Debug('WebJamSocketServer:AgController');
class AgController {
  server: any;

  clients: any[];

  tourController = TourController;

  bookController = BookController;

  constructor(server: any) {
    this.server = server;
    this.clients = [];
  }

  async resetData():Promise<string> {
    const { tour } = tourData;
    const { book } = bookData;
    try {
      await this.tourController.deleteAllDocs();
      await this.tourController.createDocs(tour);
      await this.bookController.deleteAllDocs();
      await this.bookController.createDocs(book);
    } catch (e) { debug(e.message); return e.message; }
    return 'data has been reset';
  }

  handleDisconnect(socket:any, interval: NodeJS.Timeout):void {
    (async () => {
      let disconnect: { value: undefined; done: any; };
      const dConsumer = socket.listener('disconnect').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        disconnect = await dConsumer.next();// eslint-disable-line no-await-in-loop
        clearInterval(interval);
        if (disconnect.value !== undefined) {
          const index = this.clients.indexOf(socket.id);
          if (index !== -1) this.clients.splice(index, 1);
        }
        this.server.exchange.transmitPublish('sample', this.clients.length);
        /* istanbul ignore else */if (disconnect.done) break;
      }
    })();
  }

  sendPulse(socket: { id?: any; socket?: any; }):void {
    const interval = setInterval(() => {
      socket.socket.transmit('pulse', { number: Math.floor(Math.random() * 5) });
    }, 1000);
    debug(`num clients: ${this.clients.length}`);
    socket.socket.transmit('num_clients', this.clients.length);
    this.server.exchange.transmitPublish('sample', this.clients.length);
    return this.handleDisconnect(socket.socket, interval);
  }

  async sendTours(socket: { socket: { transmit: (arg0: string, arg1: any) => void; }; }):Promise<string> {
    let allTours: any;
    try { allTours = await this.tourController.getAllSort({ datetime: -1 }); } catch (e) {
      debug(e.message); return e.message;
    }
    socket.socket.transmit('allTours', allTours);
    return 'sent tours';
  }

  async sendBooks(socket: { socket: { transmit: (arg0: string, arg1: any) => void; }; }):Promise<string> {
    let allBooks: any;
    try { allBooks = await this.bookController.getAll(); } catch (e) {
      debug(e.message); return e.message;
    }
    socket.socket.transmit('allBooks', allBooks);
    return 'sent books';
  }

  handleReceiver(socket:any):void {
    (async () => {
      let receiver: { value: number; done: any; };
      const rConsumer = socket.socket.receiver('initial message').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received initial message: ${receiver.value}`);
        if (receiver.value === 123) {
          await this.sendTours(socket);// eslint-disable-line no-await-in-loop
          await this.sendBooks(socket);// eslint-disable-line no-await-in-loop
        } else break;
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  async handleTour(func: string, data: { date: any; time: any; location: any; venue: any; }, message: string):Promise<string> {
    let r: any;// eslint-disable-next-line security/detect-object-injection
    try { r = await (this.tourController as any)[func](data); } catch (e) {
      debug(e.message); return e.message;
    }
    this.server.exchange.transmitPublish(message, r);
    return 'tour handled';
  }

  newTour(socket: { id?: any; socket?: any; }):void {
    (async () => {
      let receiver: { value: { token: any; tour: { date: any; time: any; location: any; venue: any; }; }; done: any; };
      const rConsumer = socket.socket.receiver('newTour').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received newTour message: ${receiver.value}`);
        if (!receiver.value) break;
        try {
          if (typeof receiver.value.token === 'string' && typeof receiver.value.tour.date === 'string' && typeof receiver.value.tour.time === 'string'
            && typeof receiver.value.tour.location === 'string' && typeof receiver.value.tour.venue === 'string') {
            await this.handleTour('createDocs', receiver.value.tour, 'tourCreated');// eslint-disable-line no-await-in-loop
          }
        } catch (e) { debug(e.message); }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  async handleImage(func: string, data: any, message: string):Promise<string> {
    let r: any;
    // eslint-disable-next-line security/detect-object-injection
    try { r = await (this.bookController as any)[func](data); } catch (e) {
      debug(e.message); return e.message;
    }
    this.server.exchange.transmitPublish(message, r);
    return message;
  }

  newImage(socket: { id?: any; socket?: any; }): void {
    (async () => {
      let receiver: { value: { token: string; image: any }, done: any; };
      const rConsumer = socket.socket.receiver('newImage').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received newImage message: ${JSON.stringify(receiver.value)}`);
        if (!receiver.value) break;
        try {
          if (typeof receiver.value.token === 'string'
            && typeof receiver.value.image.title === 'string' && typeof receiver.value.image.url === 'string'
          ) {
            await this.handleImage('createDocs', receiver.value.image, 'imageCreated');// eslint-disable-line no-await-in-loop
          }
        } catch (e) { debug(e.message); }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  async updateImage(data: { imageId: string; image: Record<string, unknown>; }):Promise<string> {
    let r: any;// eslint-disable-next-line security/detect-object-injection
    try { r = await this.bookController.findByIdAndUpdate(data.imageId, data.image); } catch (e) {
      debug(e.message); return e.message;// TODO handle error messages by sending this back to the UI
    }
    this.server.exchange.transmitPublish('imageUpdated', r);// this r is what was updated and the UI should now update redux
    return 'image updated';
  }

  editImage(socket: { id?: any; socket?: any; }):void {
    (async () => {
      let receiver: { value:any; done: any; };
      const rConsumer = socket.socket.receiver('editImage').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received editImage message: ${receiver.value}`);
        if (!receiver.value) break;
        if (typeof receiver.value.imageId === 'string' && typeof receiver.value.token === 'string') {
          await this.updateImage(receiver.value);// eslint-disable-line no-await-in-loop
        }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  removeImage(socket: { id?: any; socket?: any; }):void {
    (async () => {
      let receiver: { value: { imageId:string; token: string; }; done: any; };
      const rConsumer = socket.socket.receiver('deleteImage').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received deleteImage message: ${receiver.value}`);
        if (!receiver.value) break;
        try {
          if (typeof receiver.value.imageId === 'string' && typeof receiver.value.token === 'string') {
            await this.handleImage('deleteById', receiver.value.imageId, 'tourDeleted');// eslint-disable-line no-await-in-loop
          }
        } catch (e) { debug(e.message); }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  removeTour(socket: { id?: any; socket?: any; }):void {
    (async () => {
      let receiver: { value: { tour:any; token: any; }; done: any; };
      const rConsumer = socket.socket.receiver('deleteTour').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received deleteTour message: ${receiver.value}`);
        if (!receiver.value) break;
        try {
          if (typeof receiver.value.tour.tourId === 'string' && typeof receiver.value.token === 'string') {
            await this.handleTour('deleteById', receiver.value.tour.tourId, 'tourDeleted');// eslint-disable-line no-await-in-loop
          }
        } catch (e) { debug(e.message); }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  async updateTour(data: { tourId: any; tour: any; }):Promise<string> {
    let r: any;// eslint-disable-next-line security/detect-object-injection
    try { r = await this.tourController.findByIdAndUpdate(data.tourId, data.tour); } catch (e) {
      debug(e.message); return e.message;
    }
    this.server.exchange.transmitPublish('tourUpdated', r);
    return 'tour updated';
  }

  editTour(socket: { id?: any; socket?: any; }):void {
    (async () => {
      let receiver: { value:any; done: any; };
      const rConsumer = socket.socket.receiver('editTour').createConsumer();
      while (true) { // eslint-disable-line no-constant-condition
        receiver = await rConsumer.next();// eslint-disable-line no-await-in-loop
        debug(`received editTour message: ${receiver.value}`);
        if (!receiver.value) break;
        if (typeof receiver.value.tourId === 'string' && typeof receiver.value.token === 'string') {
          await this.updateTour(receiver.value);// eslint-disable-line no-await-in-loop
        }
        /* istanbul ignore else */if (receiver.done) break;
      }
    })();
  }

  addSocket(socket: { id: any; }): void {
    this.clients.push(socket.id);
    debug('clientIds');
    debug(this.clients);
    this.handleReceiver(socket);
    this.sendPulse(socket);
    this.newTour(socket);
    this.removeTour(socket);
    this.editTour(socket);
    this.newImage(socket);
    this.editImage(socket);
    this.removeImage(socket);
  }
}
export default AgController;
