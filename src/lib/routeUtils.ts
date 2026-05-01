import path from 'node:path';
import type { Request, Response } from 'express';
import type { Express } from 'express-serve-static-core';

const setRoot = (app: Express) => {
  app.get('/', (_req:Request, res:Response) => {
    res.sendFile(path.normalize(path.join(import.meta.dirname, '../../../JaMmusic/dist/index.html')));
  });
  app.get('/*splat', (req:Request, res:Response) => {
    res.sendFile(path.normalize(path.join(import.meta.dirname, '../../../JaMmusic/dist/index.html')));
  });
};

export default { setRoot };
