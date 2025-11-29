import { HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare const jsonResponseInterceptor: {
    id: string;
    beforeLoop: (hookContext: HookTriggerContext<[models.HttpResponse, models.ProcessorContext], void>) => Promise<boolean>;
};
