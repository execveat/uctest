import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare class LazyVariableInterceptor implements HookInterceptor<[models.ProcessorContext], boolean> {
    id: string;
    beforeLoop(hookContext: HookTriggerContext<[models.ProcessorContext], true>): Promise<boolean>;
    beforeTrigger(hookContext: HookTriggerContext<[models.ProcessorContext], true>): Promise<boolean>;
    private replaceAllVariables;
}
