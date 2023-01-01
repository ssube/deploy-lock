export type LockType = 'automation' | 'deploy' | 'freeze' | 'incident';

export const LOCK_TYPES: ReadonlyArray<LockType> = ['automation', 'deploy', 'freeze', 'incident'] as const;

export interface LockData {
  author: string;
  type: LockType;
}
