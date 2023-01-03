import { doesExist } from '@apextoaster/js-utils';

import { ParsedArgs } from '../args.js';
import { LockData } from '../lock.js';
import { printLock, walkPath } from '../utils.js';
import { CommandContext } from './index.js';

export async function checkCommand(context: CommandContext) {
  const { args, logger } = context;
  const { now } = args;

  logger.info({ now }, 'running check command');

  const [allowed] = await checkArgsPath(context);
  return allowed;
}

export function getCheckPaths(args: ParsedArgs): Array<string> {
  if (args.recursive) {
    return walkPath(args.path);
  } else {
    return [args.path];
  }
}

/**
 * This is the core of the check logic, including the path recursion and allow type logic.
 *
 * @todo take a limited form of `args` to make this easier to use in the Express API/tests
 */
export async function checkArgsPath(context: CommandContext): Promise<[boolean, Array<LockData>]> {
  const { args, logger, storage } = context;
  const { now, type } = args;

  const locks: Array<LockData> = [];
  const paths = getCheckPaths(args);
  for (const path of paths) {
    const lock = await storage.get(path);

    if (doesExist(lock)) {
      if (lock.expires_at < now) {
        logger.debug({ lock, path }, 'found expired lock');
      } else {
        const friendly = printLock(path, lock);
        logger.debug({ lock, friendly, path }, 'found active lock');
        locks.push(lock);

        if (lock.allow.includes(type)) {
          logger.warn({ lock, friendly, path }, 'found existing lock, check type is allowed');
        } else {
          logger.warn({ lock, friendly, path }, 'found existing lock, check type is not allowed');
        }
      }
    }
  }

  const allowed = locks.every((lock) => lock.allow.includes(type));
  return [allowed, locks];
}
