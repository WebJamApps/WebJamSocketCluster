import eetase from 'eetase';
import http from 'http';

const httpServer = eetase(http.createServer());

export default httpServer;
