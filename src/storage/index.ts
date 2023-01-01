import { Logger } from 'noicejs';

import { ParsedArgs } from '../args.js';
import { LockData } from '../lock.js';

export interface StorageContext {
  args: ParsedArgs;
  logger: Logger;
}

export interface Storage {
  get(path: string): Promise<LockData | undefined>;
  set(path: string, data: LockData): Promise<LockData>;
}

export type StorageFactory = (context: StorageContext) => Promise<Storage>;

export type StorageType = 'dynamo' | 'memory';

export const STORAGE_TYPES: ReadonlyArray<StorageType> = ['dynamo', 'memory'] as const;
