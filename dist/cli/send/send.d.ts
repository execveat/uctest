import { Command } from 'commander';
import * as models from '../../models';
import { SendOptions } from './options';
import { SelectActionResult } from './selectHttpFiles';
export declare function sendCommand(): Command;
export declare function applyPruneRefs(selection: SelectActionResult): SelectActionResult;
interface ResumeState {
    fileName: string;
    line: number;
    name?: string;
}
export declare function applyResumeState(selection: SelectActionResult, state: ResumeState): SelectActionResult;
export declare function convertCliOptionsToContext(cliOptions: SendOptions): Omit<models.HttpFileSendContext, "httpFile">;
export declare function initRequestLogger(cliOptions: SendOptions, context: Omit<models.HttpFileSendContext, 'httpFile'>): void;
export {};
