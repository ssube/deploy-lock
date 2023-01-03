import { doesExist, NotImplementedError } from '@apextoaster/js-utils';
import express, { Express, Request, Response } from 'express';

import { APP_NAME } from '../args.js';
import { LockData } from '../lock.js';
import { AdmissionRequest, buildAdmissionResponse, getAdmissionPath } from './admission.js';
import { ServerContext } from './index.js';

export const STATUS_ALLOWED = 200;
export const STATUS_DENIED = 403;

export function sendLocks(res: Response, locks: Array<LockData>, allow: boolean): void {
  if (allow) {
    res.status(STATUS_ALLOWED);
  } else {
    res.status(STATUS_DENIED);
  }
  res.json({ locks });
}

export async function expressIndex(context: ServerContext, app: Express, req: Request, res: Response): Promise<void> {
  // eslint-disable-next-line no-underscore-dangle
  const routes = app._router.stack
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((r: any) => doesExist(r.route) && doesExist(r.route.path))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((r: any) => `${r.route.path} ${Object.keys(r.route.methods)}`);

  res.send({
    app: APP_NAME,
    routes,
  });
}

export async function expressAdmission(context: ServerContext, req: Request, res: Response): Promise<void> {
  const admissionRequest = req.body as AdmissionRequest; // TODO: validate requests
  const path = getAdmissionPath('kube', admissionRequest); // TODO: take admission base from context args
  context.logger.info({ path }, 'express admission request');

  const lock = await context.storage.get(path);
  const available = doesExist(lock) === false;
  const admission = buildAdmissionResponse(available, admissionRequest.request.uid);
  context.logger.debug({ available, admission }, 'responding to admission request');
  res.json(admission).status(STATUS_ALLOWED).send();
}

export async function expressCheck(context: ServerContext, req: Request, res: Response): Promise<void> {
  const path = req.params[0];
  context.logger.info({ path }, 'express check request');

  const lock = await context.storage.get(path);
  if (doesExist(lock)) {
    sendLocks(res, [ lock ], false);
  } else {
    sendLocks(res, [], true);
  }
}

export async function expressList(context: ServerContext, req: Request, res: Response): Promise<void> {
  context.logger.info('express list request');

  const locks = await context.storage.list();
  sendLocks(res, locks, true);
}

export async function expressLock(context: ServerContext, req: Request, res: Response): Promise<void> {
  throw new NotImplementedError();
}

export async function expressPrune(context: ServerContext, req: Request, res: Response): Promise<void> {
  throw new NotImplementedError();
}

export async function expressUnlock(context: ServerContext, req: Request, res: Response): Promise<void> {
  throw new NotImplementedError();
}

export function expressListen(context: ServerContext) {
  const { args, logger } = context;

  const app = express();

  app.use(express.json());

  app.get('/', (req, res) => expressIndex(context, app, req, res));
  app.post('/admission', (req, res) => expressAdmission(context, req, res));
  app.get('/locks', (req, res) => expressList(context, req, res));
  // should /locks have a POST for create?
  app.delete('/locks', (req, res) => expressPrune(context, req, res));
  app.get('/locks/*', (req, res) => expressCheck(context, req, res));
  app.put('/locks/*', (req, res) => expressLock(context, req, res));
  app.delete('/locks/*', (req, res) => expressUnlock(context, req, res));

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
