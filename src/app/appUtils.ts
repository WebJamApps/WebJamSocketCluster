import Debug from 'debug';
import type { Express, Request, Response } from 'express';
import type http from 'node:http';
import type { ISocketConsumer } from '../types/index.js';

interface RequestData {
  0: Request;
  1: Response;
  url?: string;
}

const debug = Debug('WebJamSocketServer:appUtils');

const handleRequest = (expressApp: Express, requestData: RequestData): boolean => {
  debug(requestData[0].url);
  try { expressApp(requestData[0], requestData[1]); } catch (e) {
    const eMessage = (e as Error).message;
    debug(eMessage);
    return false;
  }
  return true;
};

const setup = (expressApp: Express, httpServer: http.Server): void => { // Add GET /health-check express route
  expressApp.get('/health-check', (req: Request, res: Response) => res.status(200).send('OK'));
  (async () => { // HTTP request handling
    let packet: { value: RequestData; done: boolean };
    const serverListener = httpServer as unknown as { listener(event: string): { createConsumer(): ISocketConsumer<RequestData> } };
    const consumer = serverListener.listener('request').createConsumer();
    while (true) {
      packet = await consumer.next() as { value: RequestData; done: boolean };
      handleRequest(expressApp, packet.value);
      /* istanbul ignore else */if (packet.done) break;
    }
  })();
};
export default { handleRequest, setup };
