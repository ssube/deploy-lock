import { CommandContext } from './index.js';

export async function pruneCommand(context: CommandContext) {
  context.logger.info('prune command');
  return true;
}
