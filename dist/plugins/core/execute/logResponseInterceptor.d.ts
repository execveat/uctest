import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare class LogResponseInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
    id: string;
    afterLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
}
