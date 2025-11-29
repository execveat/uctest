import { HookCancel } from 'hookpoint';
import * as models from '../../../models';
export declare function requestVariableReplacer(request: models.Request, context: models.ProcessorContext): Promise<void | typeof HookCancel>;
export declare function replaceVariablesInBody(request: {
    body?: models.RequestBody;
}, context: models.ProcessorContext): Promise<boolean>;
