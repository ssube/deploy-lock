import { CommandContext } from './index.js';

export async function checkCommand(context: CommandContext) {
  context.logger.info('check command');
  return true;
}
