const eetase = require('eetase');
const http = require('http');

const httpServer = eetase(http.createServer());

module.exports = httpServer;
