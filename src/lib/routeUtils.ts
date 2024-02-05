import path from 'path';
import type { Request, Response } from 'express';
import { Express } from 'express-serve-static-core';

// eslint-disable-next-line import/prefer-default-export
const setRoot = (app: Express) => {
  app.get('/', (_req:Request, res:Response) => {
    res.sendFile(path.normalize(path.join(__dirname, '../../../JaMmusic/dist/index.html')));
  });
  app.get('*', (req:Request, res:Response) => {
    res.sendFile(path.normalize(path.join(__dirname, '../../../JaMmusic/dist/index.html')));
  });
};

export default { setRoot };
