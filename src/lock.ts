export type LockType = 'automation' | 'deploy' | 'freeze' | 'incident';

export const LOCK_TYPES: ReadonlyArray<LockType> = ['automation', 'deploy', 'freeze', 'incident'] as const;

export interface LockCI {
  project: string;
  ref: string;
  commit: string;
  pipeline: string;
  job: string;
}

export interface LockEnv {
  cluster: string;
  account: string;
  target?: string; // optional
}

export interface LockData {
  type: LockType;

  /**
   * Who created the lock.
   */
  author: string;

  /**
   * Links with more information about the lock.
   */
  links: Record<string, string>;

  created_at: number;
  updated_at: number;
  expires_at: number;

  /**
   * Environment where the lock was created. Often duplicates the path, but useful for cross-project locks.
   */
  env: LockEnv;

  /**
   * Attribution info when CI was the source of the lock.
   */
  ci?: LockCI;
}
