import { LogLevel } from '../../models';

export enum SendFilterOptions {
  onlyFailed = 'only-failed',
}

export type OutputType = 'body' | 'headers' | 'response' | 'none' | 'short' | 'exchange' | 'timings';

export interface SendOptions {
  env?: Array<string>;
  all?: boolean;
  bail?: boolean;
  filter?: SendFilterOptions;
  help?: boolean;
  line?: number;
  name?: Array<string>;
  interactive?: boolean;
  insecure?: boolean;
  json?: boolean;
  jsonl?: boolean;
  junit?: boolean;
  output?: OutputType;
  outputFailed?: OutputType;
  raw?: boolean;
  repeatMode?: 'sequential' | 'parallel';
  repeat?: number;
  parallel?: number;
  silent?: boolean;
  tag?: Array<string>;
  timeout?: number;
  var?: Array<string>;
  verbose?: boolean;
  pruneRefs?: boolean;
  resume?: boolean;
}

export function getLogLevel(cliOptions: SendOptions): LogLevel | undefined {
  if (cliOptions.json || cliOptions.junit || cliOptions.jsonl) {
    return LogLevel.none;
  }
  if (cliOptions.silent) {
    return LogLevel.error;
  }
  if (cliOptions.verbose) {
    return LogLevel.trace;
  }
  return undefined;
}
