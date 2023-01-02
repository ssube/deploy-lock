import { printLock } from '../utils.js';
import { CommandContext } from './index.js';

export async function listCommand(context: CommandContext) {
  const { logger, storage } = context;

  logger.info('running list command');

  const locks = await storage.list();
  for (const lock of locks) {
    const friendly = printLock(lock.path, lock);
    logger.info({ friendly, path: lock.path }, 'found lock');
  }

  return true;
}
