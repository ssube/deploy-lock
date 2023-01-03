export const LOCK_TYPES = {
  automation: 'an automation run',
  deploy: 'a deploy',
  freeze: 'a change freeze',
  incident: 'an incident',
  maintenance: 'a maintenance window',
} as const;

export type LockType = keyof typeof LOCK_TYPES;

export interface LockCI {
  project: string;
  ref: string;
  commit: string;
  pipeline: string;
  job: string;
}

export interface LockData {
  type: LockType;

  path: string;

  /**
   * Who created the lock.
   */
  author: string;

  /**
   * Check types that should be allowed during this lock.
   */
  allow: Array<LockType>;

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
  source: string;

  /**
   * Attribution info when CI was the source of the lock.
   */
  ci?: LockCI;
}
