import { doesExist } from '@apextoaster/js-utils';
import { LockData } from '../lock.js';
import { Storage, StorageContext } from './index.js';

export async function connectMemory(context: StorageContext): Promise<Storage> {
  const storage = new Map<string, LockData>();

  for (const lock of Array.from(context.args.assume)) {
    const match = /^([-a-z/]+):({.+})$/.exec(lock);
    if (doesExist(match)) {
      const [_full, path, rawData] = Array.from(match);
      const data = JSON.parse(rawData) as LockData;

      context.logger.info({ path, data }, 'assuming lock exists');
      storage.set(path, data);
    } else {
      context.logger.warn({ lock }, 'invalid lock in assume');
    }
  }

  return {
    async get(path: string) {
      context.logger.info({ path }, 'getting data from memory');
      return storage.get(path);
    },
    async set(path: string, data: LockData) {
      context.logger.info({ path, data }, 'setting data in memory');
      storage.set(path, data);
      return data;
    },
  };
}
