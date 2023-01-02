import { doesExist } from '@apextoaster/js-utils';

import { ParsedArgs } from '../args.js';
import { printLock, walkPath } from '../utils.js';
import { CommandContext } from './index.js';

export async function checkCommand(context: CommandContext) {
  const { args, logger, storage } = context;
  const { now } = args;

  logger.info({ now }, 'running check command');

  const paths = getCheckPaths(args);
  for (const path of paths) {
    const lock = await storage.get(path);

    if (doesExist(lock)) {
      if (lock.expires_at < now) {
        logger.info({ lock, path }, 'found expired lock');
      } else {
        const friendly = printLock(path, lock);
        logger.info({ lock, friendly, path }, 'found active lock');
        return false;
      }
    }
  }

  logger.info({ path: args.path }, 'no locks found');

  return true;
}

export function getCheckPaths(args: ParsedArgs): Array<string> {
  if (args.recursive) {
    return walkPath(args.path);
  } else {
    return [args.path];
  }
}
