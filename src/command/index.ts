import { Logger } from 'noicejs';

import { ParsedArgs } from '../args.js';
import { Storage } from '../storage/index.js';

export interface CommandContext {
  args: ParsedArgs;
  logger: Logger;
  storage: Storage;
}

export type CommandFunction = (context: CommandContext) => Promise<boolean>;

export type CommandName = 'check' | 'list' | 'listen' | 'lock' | 'unlock' | 'prune';
