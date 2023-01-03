import { Logger } from 'noicejs';

import { ParsedArgs } from '../args.js';
import { LockData } from '../lock.js';
import { Storage } from '../storage/index.js';

export interface ServerContext {
  args: ParsedArgs;
  logger: Logger;
  storage: Storage;
}

export interface Server {
  close(): Promise<void>;
}

export interface ServerResponse {
  locks: Array<LockData>;
}
