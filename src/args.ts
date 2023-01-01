import yargs from 'yargs';

import { CommandName } from './command/index.js';
import { LOCK_TYPES, LockType } from './lock.js';
import { STORAGE_TYPES, StorageType } from './storage/index.js';

/**
 * CLI options.
 *
 * @public
 */
export interface ParsedArgs {
  /**
   * Remaining arguments.
   */
  _: Array<string | number>;

  command: CommandName;

  /**
   * Placeholder to allow better exit logic.
   */
  help?: boolean;

  type: LockType;
  path: string;
  author?: string;
  duration?: string;
  until?: string;
  recursive: boolean;
  links: Array<string>;
  now: number;

  'env-cluster'?: string;
  'env-account'?: string;
  'env-target'?: string;

  'ci-project'?: string;
  'ci-ref'?: string;
  'ci-commit'?: string;
  'ci-pipeline'?: string;
  'ci-job'?: string;

  storage: StorageType;
  region: string;
  table: string;
  endpoint?: string;
  fake: Array<string>; // TODO: keep this long-term?
}

export const APP_NAME = 'deploy-lock';
export const ENV_NAME = 'DEPLOY_LOCK';

/**
 * Parse CLI options and environment variables.
 *
 * @public
 */
export async function parseArgs(argv: Array<string>): Promise<ParsedArgs> {
  let command: CommandName = 'check';

  const parser = yargs(argv)
    .usage(`Usage: ${APP_NAME} <command> [options]`)
    .command('check', 'check if a lock exists')
    .command('list', 'list all locks', () => { /* noop */}, () => {
      command = 'list';
    })
    .command('lock', 'lock a path', () => { /* noop */}, () => {
      command = 'lock';
    })
    .command('unlock', 'unlock a path', () => { /* noop */}, () => {
      command = 'unlock';
    })
    .command('prune', 'remove expired locks', () => { /* noop */}, () => {
      command = 'prune';
    })
    .options({
      'author': {
        type: 'string',
      },
      'duration': {
        type: 'string',
      },
      'endpoint': {
        type: 'string',
      },
      'fake': {
        default: [] as Array<string>,
        string: true,
        type: 'array',
      },
      'links': {
        default: [] as Array<string>,
        string: true,
        type: 'array',
      },
      'now': {
        type: 'number',
        default: Date.now(),
      },
      'path': {
        type: 'string',
        require: true,
      },
      'recursive': {
        type: 'boolean',
        default: true,
      },
      'region': {
        type: 'string',
        default: 'us-east-1',
      },
      'storage': {
        type: 'string',
        choices: Object.keys(STORAGE_TYPES) as ReadonlyArray<StorageType>,
        require: true,
        default: 'memory' as StorageType,
      },
      'table': {
        type: 'string',
        default: 'locks',
      },
      'type': {
        type: 'string',
        require: true,
        choices: Object.keys(LOCK_TYPES) as ReadonlyArray<LockType>,
      },
      'until': {
        type: 'string',
      },
      'env-cluster': {
        type: 'string',
      },
      'env-account': {
        type: 'string',
      },
      'env-target': {
        type: 'string',
      },
      'ci-project': {
        type: 'string',
      },
      'ci-ref': {
        type: 'string',
      },
      'ci-commit': {
        type: 'string',
      },
      'ci-pipeline': {
        type: 'string',
      },
      'ci-job': {
        type: 'string',
      },
    })
    .env(ENV_NAME)
    .help()
    .exitProcess(false);

  const args = await parser.parse(argv);
  return {
    ...args,
    command,
  };
}
