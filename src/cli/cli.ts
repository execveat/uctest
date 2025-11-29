import { join } from 'path';

import * as utils from '../utils';
import { initIOProvider } from './initCliProvider';
import { sendCommand } from './send';

export async function createProgram() {
  const packageJson = await utils.parseJson<Record<string, string>>(join(__dirname, '../package.json'));
  const program = sendCommand();
  program.version(packageJson?.version || '0.0.1');
  return program;
}

export async function execute(rawArgs: string[]): Promise<void> {
  try {
    await initIOProvider();
    const program = await createProgram();
    await program.parseAsync(rawArgs);
  } catch (err) {
    console.error(err);
    if (!process.exitCode) {
      process.exitCode = 1;
    }
    throw err;
  } finally {
    // needed because of async
    // eslint-disable-next-line node/no-process-exit
    process.exit();
  }
}
