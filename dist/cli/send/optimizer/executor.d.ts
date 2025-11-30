import * as models from '../../../models';
import { createEmptyProcessorContext } from '../../../httpYacApi';
import * as utils from '../../../utils';
import { DependencyModel, ExecutionPlan, ResumeState } from './types';
export interface ExecuteOptions {
    resumeState?: ResumeState;
    showPlan?: boolean;
    showProgress?: boolean;
}
export interface ExecutionRuntime {
    createProcessorContext: typeof createEmptyProcessorContext;
    executeGlobalScripts: typeof utils.executeGlobalScripts;
}
export declare function executePlan(plan: ExecutionPlan, model: DependencyModel, httpFiles: Array<models.HttpFile>, context: Omit<models.HttpFileSendContext, 'httpFile'> & {
    options?: Record<string, unknown>;
}, options?: ExecuteOptions, runtime?: ExecutionRuntime): Promise<models.ProcessedHttpRegion[]>;
export declare function countFilesInPlan(plan: ExecutionPlan, model: DependencyModel): number;
export declare function assertRequestedExecuted(plan: ExecutionPlan, executed: Set<string>): void;
