import { buildLock } from '../utils.js';
import { checkCommand } from './check.js';
import { CommandContext } from './index.js';

export async function lockCommand(context: CommandContext) {
  const { args, logger, storage } = context;

  logger.info('lock command');

  const available = await checkCommand(context);
  if (available === false) {
    logger.info('lock already exists');
    return false;
  }

  const data = buildLock(process.env);
  const lock = await storage.set(args.path, data);
  logger.info({ lock, path: args.path }, 'created new lock');
  return true;
}
