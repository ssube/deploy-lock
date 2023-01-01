import { doesExist } from '@apextoaster/js-utils';
import { CommandContext } from './index.js';

export async function unlockCommand(context: CommandContext) {
  const { args, logger, storage } = context;

  logger.info('running unlock command');

  const lock = await storage.delete(args.path);
  if (doesExist(lock)) {
    logger.info({ lock }, 'deleted existing lock');
  } else {
    logger.info('no existing lock found');
  }

  return true;
}
