import { CommandContext } from './index.js';

export async function unlockCommand(context: CommandContext) {
  context.logger.info('unlock command');
  return true;
}
