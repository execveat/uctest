import { HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare const excludeProxyInterceptor: {
    id: string;
    afterLoop: (hookContext: HookTriggerContext<[models.Request, models.ProcessorContext], void>) => Promise<boolean>;
};
