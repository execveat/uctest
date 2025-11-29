import { HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare const escapeVariableInterceptor: {
    id: string;
    afterLoop: (hookContext: HookTriggerContext<[unknown, string, models.ProcessorContext], unknown>) => Promise<boolean>;
};
