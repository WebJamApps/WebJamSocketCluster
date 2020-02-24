class AgController {
  constructor(server) {
    this.server = server;
    this.clients = [];
  }

  addSocket(id) {
    this.clients.push(id);
    console.log('clientIds');
    console.log(this.clients);
  }
}
module.exports = AgController;
