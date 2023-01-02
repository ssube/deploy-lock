import { Logger } from 'noicejs';

import { ParsedArgs } from '../args.js';
import { Storage } from '../storage/index.js';

export interface ServerContext {
  args: ParsedArgs;
  logger: Logger;
  storage: Storage;
}

export interface Server {
  close(): Promise<void>;
}
