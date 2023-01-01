import { doesExist } from '@apextoaster/js-utils';
import { LockData } from '../lock.js';

import { splitPath } from '../utils.js';
import { CommandContext } from './index.js';

export async function checkCommand(context: CommandContext) {
  const { args, logger, storage } = context;
  logger.info('check command');

  const paths = splitPath(args.path);
  for (const path of paths) {
    const existing = await storage.get(path);

    if (doesExist(existing)) {
      const friendly = printLock(path, existing);
      logger.info({ existing, friendly, path }, 'found lock');
      return false;
    }
  }

  logger.info({ path: args.path }, 'no locks found');
  return true;
}

export function printLock(path: string, data: LockData): string {
  return `${path} is locked until ${data.expires_at} by a ${data.type} in ${data.env.cluster}`;
}
