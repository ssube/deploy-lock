/* eslint-disable camelcase */
import { doesExist, InvalidArgumentError, mustDefault } from '@apextoaster/js-utils';

import { ParsedArgs } from './args.js';
import { LOCK_TYPES, LockCI, LockData } from './lock.js';

export const MILLIS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_YEAR = 365;

export function matchPath(baseStr: string, otherStr: string): boolean {
  const base = splitPath(baseStr);
  const other = splitPath(otherStr);

  if (other.length < base.length) {
    return false;
  }

  for (let i = 0; i <= base.length; ++i) {
    if (base[i] !== other[i]) {
      return false;
    }
  }

  return true;
}

export function splitPath(path: string): Array<string> {
  return path.toLowerCase().split('/').map((part) => part.trim()).filter((part) => part.length > 0);
}

export function walkPath(path: string, start = 0): Array<string> {
  const segments = splitPath(path);

  const paths = [];
  for (let i = (start + 1); i <= segments.length; ++i) {
    const next = segments.slice(start, i).join('/');
    paths.push(next);
  }

  return paths;
}

export const ENV_UNSET = 'not set';

export function buildCI(args: ParsedArgs, env: typeof process.env): LockCI | undefined {
  if (doesExist(env.GITLAB_CI)) {
    return {
      project: mustDefault(args['ci-project'], env.CI_PROJECT_PATH, ENV_UNSET),
      ref: mustDefault(args['ci-ref'], env.CI_COMMIT_REF_SLUG, ENV_UNSET),
      commit: mustDefault(args['ci-commit'], env.CI_COMMIT_SHA, ENV_UNSET),
      pipeline: mustDefault(args['ci-pipeline'], env.CI_PIPELINE_ID, ENV_UNSET),
      job: mustDefault(args['ci-job'], env.CI_JOB_ID, ENV_UNSET),
    };
  }

  return undefined;
}

export function buildAuthor(args: ParsedArgs, env: typeof process.env): string {
  if (doesExist(env.GITLAB_CI)) {
    return mustDefault(args.author, env.GITLAB_USER_EMAIL, env.USER);
  }

  return mustDefault(args.author, env.USER);
}

export function buildLinks(args: ParsedArgs): Record<string, string> {
  const links: Record<string, string> = {};

  for (const link of args.links) {
    const match = /^([-a-z]+):(.+)$/.exec(link);
    if (doesExist(match)) {
      const [_full, name, url] = Array.from(match);
      links[name] = url;
    }
  }

  return links;
}

export function buildLock(args: ParsedArgs, env = process.env): LockData {
  return {
    type: mustDefault(args.type, 'deploy'),
    path: args.path,
    author: buildAuthor(args, env),
    links: buildLinks(args),
    allow: args.allow,
    created_at: args.now,
    updated_at: args.now,
    expires_at: calculateExpires(args),
    source: args.source,
    ci: buildCI(args, env),
  };
}

export function calculateExpires(args: ParsedArgs): number {
  if (doesExist(args.until)) {
    return parseTime(args.until);
  }

  if (doesExist(args.duration)) {
    return args.now + parseTime(args.duration);
  }

  throw new InvalidArgumentError('must provide either duration or until');
}

export const TIME_MULTIPLIERS: Array<[RegExp, number]> = [
  [/^(\d+)$/, 1], // integer seconds
  [/^(\d+)s$/, 1], // human seconds
  [/^(\d+)m$/, SECONDS_PER_MINUTE], // human minutes
  [/^(\d+)h$/, SECONDS_PER_MINUTE * MINUTES_PER_HOUR], // human hours
  [/^(\d+)d$/, SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY], // human days
  [/^(\d+)y$/, SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY * DAYS_PER_YEAR], // human years
];

export const TIME_ISO_MATCH = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z?/;

/**
 * Convert a string of the form `12345` or `15m` into seconds.
 */
export function parseTime(time: number | string): number {
  if (typeof time === 'number') {
    return time;
  }

  if (TIME_ISO_MATCH.test(time)) {
    return dateToSeconds(new Date(time));
  }

  for (const [regex, mult] of TIME_MULTIPLIERS) {
    const match = time.match(regex);
    if (doesExist(match)) {
      const [_full, digits] = Array.from(match);
      return parseInt(digits, 10) * mult;
    }
  }

  throw new InvalidArgumentError('invalid time');
}

export function printLinks(links: Record<string, string>): Array<string> {
  return Object.keys(links).map((name) => `${name}: ${links[name]}`);
}

export function printTime(time: number): string {
  return new Date(time * MILLIS_PER_SECOND).toLocaleString();
}

export function printLock(path: string, data: LockData): string {
  const friendlyExpires = printTime(data.expires_at);
  const friendlyLinks = printLinks(data.links);
  const friendlyType = LOCK_TYPES[data.type];

  const base = `${path} is locked until ${friendlyExpires} by ${friendlyType} in ${data.source}`;
  return [
    base,
    ...friendlyLinks,
  ].join(', ');
}

export function splitEmpty(val: string, delimiter = ','): Array<string> {
  if (val.length === 0) {
    return [];
  }

  return val.split(delimiter).map((it) => it.trim()).filter((it) => it.length > 0);
}

export function dateToSeconds(date: Date): number {
  return Math.round(date.getTime() / MILLIS_PER_SECOND);
}
