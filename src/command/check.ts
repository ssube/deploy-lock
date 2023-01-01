import { doesExist } from '@apextoaster/js-utils';

import { splitPath } from '../utils.js';
import { CommandContext } from './index.js';

export async function checkCommand(context: CommandContext) {
  const { args, logger, storage } = context;
  logger.info('check command');

  const paths = splitPath(args.path);
  for (const path of paths) {
    const existing = await storage.get(path);

    if (doesExist(existing)) {
      logger.info({ existing, path }, 'found lock');
      return false;
    }
  }

  logger.info({ path: args.path }, 'no locks found');
  return true;
}
