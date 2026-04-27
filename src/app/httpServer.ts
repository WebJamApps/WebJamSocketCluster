import eetase from 'eetase';
import http from 'node:http';

const httpServer = eetase(http.createServer());

export default httpServer;
