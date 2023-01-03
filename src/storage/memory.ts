import { doesExist, NotImplementedError } from '@apextoaster/js-utils';

import { LockData } from '../lock.js';
import { buildLock } from '../utils.js';
import { Storage, StorageContext } from './index.js';

export type Cache = Map<string, LockData>;

export async function memoryDelete(context: StorageContext, cache: Cache, path: string): Promise<LockData | undefined> {
  const value = cache.get(path);

  if (cache.delete(path)) {
    return value;
  }

  return undefined;
}
/**
 * Get a single lock from an in-memory data store.
 */
export async function memoryGet(context: StorageContext, cache: Cache, path: string): Promise<LockData | undefined> {
  const { logger } = context;

  logger.info({ path }, 'getting data from memory');

  return cache.get(path);
}

/**
 * List all locks in an in-memory data store.
 */
export async function memoryList(_context: StorageContext, cache: Cache): Promise<Array<LockData>> {
  return Array.from(cache.values());
}

/**
 * Set a single lock in an in-memory data store.
 */
export async function memorySet(context: StorageContext, cache: Cache, data: LockData): Promise<LockData> {
  const { logger } = context;
  const { path } = data;

  logger.info({ path, data }, 'setting data in memory');
  cache.set(path, data);

  return data;
}

/**
 * Build an in-memory data store including locks from `--assume` arguments.
 */
export function buildCache(context: StorageContext): Cache {
  const cache: Cache = new Map<string, LockData>();

  for (const lock of Array.from(context.args.fake)) {
    const match = /^([-a-z/]+):({.+})$/.exec(lock);
    if (doesExist(match)) {
      const [_full, path, rawData] = Array.from(match);
      const base = buildLock(context.args); // TODO: require full records?
      const data = JSON.parse(rawData) as LockData;

      context.logger.info({ path, data }, 'assuming lock exists');
      cache.set(path, Object.assign(base, data));
    } else {
      context.logger.warn({ lock }, 'invalid lock in assume');
    }
  }

  return cache;
}

/**
 * "Connect" to an in-memory data store.
 *
 * This is not the most useful on the CLI and is meant for the API and tests.
 */
export async function memoryConnect(context: StorageContext): Promise<Storage> {
  const cache = buildCache(context);

  return {
    delete(path: string) {
      return memoryDelete(context, cache, path);
    },
    get(path: string) {
      return memoryGet(context, cache, path);
    },
    list() {
      return memoryList(context, cache);
    },
    set(data: LockData) {
      return memorySet(context, cache, data);
    },
  };
}
