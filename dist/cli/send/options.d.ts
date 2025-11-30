import { LogLevel } from '../../models';
export type OutputType = 'body' | 'headers' | 'response' | 'none' | 'short' | 'exchange' | 'timings';
export interface SendOptions {
    keepGoing?: boolean;
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
export declare function getLogLevel(cliOptions: SendOptions): LogLevel | undefined;
