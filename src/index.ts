import process from 'node:process';

import { ExitCode, main } from './main.js';

/**
 * A Discord chat bot for Conan Exiles game servers.
 *
 * @packageDocumentation
 */

const ARGS_START = 2; // trim the first few, yargs does not like them

/* c8 ignore start */
main(process.argv.slice(ARGS_START)).then((code) => {
  process.exit(code);
}).catch((err) => {
  // eslint-disable-next-line no-console
  console.error('uncaught error from main', err);
  process.exit(ExitCode.ERROR);
});
/* c8 ignore stop */
