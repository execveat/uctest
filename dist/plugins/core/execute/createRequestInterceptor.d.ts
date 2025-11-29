import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare class CreateRequestInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
    id: string;
    beforeLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
}
