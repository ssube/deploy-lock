import { doesExist } from '@apextoaster/js-utils';

import { LockData } from '../lock.js';
import { buildLock } from '../utils.js';
import { Storage, StorageContext } from './index.js';

export type Cache = Map<string, LockData>;

export async function memoryGet(context: StorageContext, cache: Cache, path: string): Promise<LockData | undefined> {
  context.logger.info({ path }, 'getting data from memory');
  return cache.get(path);
}

export async function memorySet(context: StorageContext, cache: Cache, path: string, data: LockData): Promise<LockData> {
  context.logger.info({ path, data }, 'setting data in memory');
  cache.set(path, data);
  return data;
}

export function buildCache(context: StorageContext): Cache {
  const cache: Cache = new Map<string, LockData>();

  for (const lock of Array.from(context.args.assume)) {
    const match = /^([-a-z/]+):({.+})$/.exec(lock);
    if (doesExist(match)) {
      const [_full, path, rawData] = Array.from(match);
      const base = buildLock(context.args); // TODO: remove this
      const data = JSON.parse(rawData) as LockData;

      context.logger.info({ path, data }, 'assuming lock exists');
      cache.set(path, Object.assign(base, data));
    } else {
      context.logger.warn({ lock }, 'invalid lock in assume');
    }
  }

  return cache;
}

export async function memoryConnect(context: StorageContext): Promise<Storage> {
  const cache = buildCache(context);

  return {
    async get(path: string) {
      return memoryGet(context, cache, path);
    },
    async set(path: string, data: LockData) {
      return memorySet(context, cache, path, data);
    },
  };
}
