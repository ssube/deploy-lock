import { doesExist } from '@apextoaster/js-utils';
import express, { Request, Response } from 'express';

import { ServerContext } from './index.js';

export function expressListen(context: ServerContext) {
  const { args, logger } = context;

  const app = express();

  const hello = (req: Request, res: Response) => res.send('Hello world! ' + req.params[0]);
  app.get('/', hello);
  app.get('/admission', hello);
  app.get('/locks', hello);
  app.delete('/locks', hello);
  app.get('/locks/*', hello);
  app.put('/locks/*', hello);
  app.delete('/locks/*', hello);

  const server = app.listen(args.listen, () => {
    logger.info('API server listening');
  });

  return {
    close() {
      return new Promise<void>((res, rej) => {
        server.close((err) => {
          if (doesExist(err)) {
            rej(err);
          } else {
            res();
          }
        });
      });
    }
  };
}
