import { createLogger, DEBUG } from 'bunyan';

import { APP_NAME, parseArgs } from './args.js';
import { checkCommand } from './command/check.js';
import { CommandFunction, CommandName } from './command/index.js';
import { listCommand } from './command/list.js';
import { listenCommand } from './command/listen.js';
import { lockCommand } from './command/lock.js';
import { pruneCommand } from './command/prune.js';
import { unlockCommand } from './command/unlock.js';
import { dynamoConnect } from './storage/dynamo.js';
import { StorageFactory, StorageType } from './storage/index.js';
import { memoryConnect } from './storage/memory.js';

/**
 * Process exit codes.
 */
export enum ExitCode {
  SUCCESS = 0,
  ERROR = 1,
}

export const Commands: Record<CommandName, CommandFunction> = {
  check: checkCommand,
  list: listCommand,
  listen: listenCommand,
  lock: lockCommand,
  unlock: unlockCommand,
  prune: pruneCommand,
};

export const Storages: Record<StorageType, StorageFactory> = {
  dynamo: dynamoConnect,
  memory: memoryConnect,
};

/**
 * Connect to some bots and wait for commands or an exit signal.
 */
export async function main(argv: Array<string>): Promise<ExitCode> {
  const args = await parseArgs(argv);

  if (args.help === true) {
    return ExitCode.SUCCESS;
  }

  const logger = createLogger({
    name: APP_NAME,
    level: DEBUG,
  });

  logger.info({ args }, `launching ${APP_NAME}`);

  const storageFactory = Storages[args.storage];
  const storage = await storageFactory({ args, logger });

  const commandFunction = Commands[args.command];
  const result = await commandFunction({ args, logger, storage });

  if (result) {
    return ExitCode.SUCCESS;
  } else {
    logger.error({ command: args.command }, 'command failed');
    return ExitCode.ERROR;
  }
}
