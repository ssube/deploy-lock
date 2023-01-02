/* eslint-disable @typescript-eslint/indent */
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
  source: string;

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

// Necessary hint for yargs .command()
export interface CommandPath { path: string }

export function pathBuilder(builder: yargs.Argv) {
  builder.positional('path', {
    type: 'string',
  });
}

/**
 * Parse CLI options and environment variables.
 *
 * @public
 */
export async function parseArgs(argv: Array<string>): Promise<ParsedArgs> {
  let command: CommandName = 'check';

  const parser = yargs(argv)
    .usage(`Usage: ${APP_NAME} <command> [options]`)
    .command('check <path>', 'check if a lock exists')
    .command<CommandPath>('list <path>', 'list all locks', pathBuilder, () => {
      command = 'list';
    })
    .command<CommandPath>('lock <path>', 'lock a path', pathBuilder, () => {
      command = 'lock';
    })
    .command<CommandPath>('unlock <path>', 'unlock a path', pathBuilder, () => {
      command = 'unlock';
    })
    .command<CommandPath>('prune [path]', 'remove expired locks', pathBuilder, () => {
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
        // eslint-disable-next-line @typescript-eslint/no-magic-numbers
        default: Math.round(Date.now() / 1000),
      },
      'recursive': {
        type: 'boolean',
        default: true,
      },
      'region': {
        type: 'string',
        default: 'us-east-1',
      },
      'source': {
        type: 'string',
        require: true,
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
