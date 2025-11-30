import { LogLevel } from '../../models';

export type OutputType = 'body' | 'headers' | 'response' | 'none' | 'short' | 'exchange' | 'timings';

export interface SendOptions {
  keepGoing?: boolean; // -k, --keep-going: continue running after failures
  help?: boolean;
  line?: number;
  name?: Array<string>;
  json?: boolean;
  jsonl?: boolean;
  output?: OutputType;
  outputFailed?: OutputType;
  silent?: boolean;
  tag?: Array<string>;
  timeout?: number;
  var?: Array<string>;
  verbose?: boolean;
  pruneRefs?: boolean;
  resume?: boolean;
  stateFile?: string;
  noCache?: boolean;
  showPlan?: boolean;
}

export function getLogLevel(cliOptions: SendOptions): LogLevel | undefined {
  if (cliOptions.json || cliOptions.jsonl) {
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
