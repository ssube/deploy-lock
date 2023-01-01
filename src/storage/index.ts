import { Logger } from 'noicejs';

import { ParsedArgs } from '../args.js';
import { LockData } from '../lock.js';

export interface StorageContext {
  args: ParsedArgs;
  logger: Logger;
}

export interface Storage {
  delete(path: string): Promise<LockData | undefined>;
  get(path: string): Promise<LockData | undefined>;
  list(): Promise<Array<LockData>>;
  set(data: LockData): Promise<LockData>;
}

export type StorageFactory = (context: StorageContext) => Promise<Storage>;

export const STORAGE_TYPES = {
  dynamo: 'DynamoDB',
  memory: 'in-memory',
} as const;

export type StorageType = keyof typeof STORAGE_TYPES;
