import { doesExist } from '@apextoaster/js-utils';
import { splitPath } from '../utils.js';

import { CommandContext } from './index.js';

export async function lockCommand(context: CommandContext) {
  const { args, logger, storage } = context;

  logger.info('lock command');

  const paths = splitPath(args.path);
  for (const path of paths) {
    const existing = await storage.get(path);

    if (doesExist(existing)) {
      logger.info({ existing }, 'lock already exists');
      return false;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lock = await storage.set(args.path, {} as any);
  logger.info({ lock, path: args.path }, 'created new lock');
  return true;
}
