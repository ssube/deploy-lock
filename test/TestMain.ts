import { expect } from 'chai';

import { ExitCode, main } from '../src/main.js';

describe('main entry point', () => {
  it('should print help and return without exiting the process', async () => {
    await expect(main(['--help'])).to.eventually.equal(ExitCode.SUCCESS);
  });
});
