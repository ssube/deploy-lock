export type LockType = 'automation' | 'deploy' | 'freeze' | 'incident';

export const LOCK_TYPES: ReadonlyArray<LockType> = ['automation', 'deploy', 'freeze', 'incident'] as const;

export interface LockData {
  type: LockType;
  author: string;
  links: Record<string, string>;

  // Timestamps, calculated from --duration and --until
  created_at: number;
  updated_at: number;
  expires_at: number;

  // Env fields
  // often duplicates of path, but useful for cross-project locks
  env: {
    cluster: string;
    account: string;
    target?: string; // optional
  };

  // CI fields, optional
  ci?: {
    project: string;
    ref: string;
    commit: string;
    pipeline: string;
    job: string;
  };
}
