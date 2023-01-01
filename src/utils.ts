/* eslint-disable camelcase */
import { doesExist, mustDefault } from '@apextoaster/js-utils';
import { LockData } from './lock.js';

export function splitPath(path: string): Array<string> {
  const segments = path.split('/');

  const paths = [];
  for (let i = 1; i <= segments.length; ++i) {
    const next = segments.slice(0, i).join('/');
    paths.push(next);
  }

  return paths;
}

export function buildCI(env: typeof process.env): LockData['ci'] {
  if (doesExist(env.GITLAB_CI)) {
    return {
      project: '',
      ref: '',
      commit: '',
      pipeline: '',
      job: '',
    };
  }

  return undefined;
}

export function buildEnv(env: typeof process.env): LockData['env'] {
  return {
    cluster: '',
    account: '',
  };
}

export function buildLock(env = process.env): LockData {
  return {
    type: 'deploy',
    author: mustDefault(env.USER, ''),
    links: {},
    created_at: 0,
    updated_at: 0,
    expires_at: 0,
    env: buildEnv(env),
    ci: buildCI(env),
  };
}
