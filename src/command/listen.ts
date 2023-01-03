import { signal, SIGNAL_RESET, SIGNAL_STOP } from '@apextoaster/js-utils';

import { expressListen } from '../server/express.js';
import { CommandContext } from './index.js';

export async function listenCommand(context: CommandContext) {
  const { logger } = context;

  logger.info('running listen command');

  const api = expressListen(context);
  await signal(SIGNAL_RESET, SIGNAL_STOP);
  await api.close();

  return true;
}

