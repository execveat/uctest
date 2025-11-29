import { HookCancel } from 'hookpoint';
import * as models from '../models';
export declare function replaceVariables(text: unknown, type: models.VariableType | string, context: models.ProcessorContext): Promise<typeof HookCancel | unknown>;
export declare function replaceFilePath<T>(fileName: string, context: models.ProcessorContext, action: (path: models.PathLike) => Promise<T>): Promise<T | undefined>;
export declare function expandVariable(value: unknown, variables: models.Variables): unknown;
export declare function setVariableInContext(variables: models.Variables, context: models.ProcessorContext): void;
export declare function cleanVariables(variables: models.Variables): {
    [k: string]: unknown;
};
export declare function deleteVariableInContext(key: string, context: models.ProcessorContext): void;
export declare function unsetVariableInContext(variables: models.Variables, context: models.ProcessorContext): void;
