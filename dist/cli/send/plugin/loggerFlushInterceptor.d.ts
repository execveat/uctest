import { HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare const loggerFlushInterceptor: {
    id: string;
    afterLoop: (hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) => Promise<boolean>;
};
