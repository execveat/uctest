import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare class MultipartMixedInterceptor implements HookInterceptor<[models.getHttpLineGenerator, models.ParserContext], undefined> {
    get id(): string;
    beforeLoop(hookContext: HookTriggerContext<[models.getHttpLineGenerator, models.ParserContext], undefined>): Promise<boolean | undefined>;
}
