import type { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../models';
export declare function provideGlobalVariableStore(env: string[] | undefined): Promise<models.Variables>;
export declare class GlobalVariablesInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
    id: string;
    afterLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
}
