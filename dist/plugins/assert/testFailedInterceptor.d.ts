import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../models';
export declare class TestFailedInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
    id: string;
    before: string[];
    onError(err: unknown, hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
}
