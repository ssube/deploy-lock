import { CommandContext } from './index.js';

export async function pruneCommand(context: CommandContext) {
  const { logger, storage } = context;
  const now = Date.now();

  logger.info({ now }, 'running prune command');

  const locks = await storage.list();
  for (const lock of locks) {
    if (lock.expires_at < now) {
      logger.warn({ lock }, 'lock has expired');
      await storage.delete(lock.path);
    }
  }

  return true;
}
