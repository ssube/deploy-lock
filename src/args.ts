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

  'env-cluster'?: string;
  'env-account'?: string;
  'env-target'?: string;

  'ci-project'?: string;
  'ci-ref'?: string;
  'ci-commit'?: string;
  'ci-pipeline'?: string;
  'ci-job'?: string;

  storage: StorageType;
  table?: string;
  region: string;

  // TODO: should this stay?
  assume: Array<string>;
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
      'assume': {
        default: [] as Array<string>,
        string: true,
        type: 'array',
      },
      'author': {
        type: 'string',
      },
      'duration': {
        type: 'string',
      },
      'links': {
        default: [] as Array<string>,
        string: true,
        type: 'array',
      },
      'path': {
        type: 'string',
        require: true,
      },
      'recursive': {
        type: 'boolean',
        default: true,
      },
      'storage': {
        type: 'string',
        choices: STORAGE_TYPES,
        require: true,
        // TODO: default, but TS gets mad
      },
      'table': {
        type: 'string',
      },
      'region': {
        type: 'string',
        default: 'us-east-1',
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
