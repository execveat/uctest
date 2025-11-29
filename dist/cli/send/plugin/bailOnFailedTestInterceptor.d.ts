import { HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare const bailOnFailedTestInterceptor: {
    id: string;
    beforeLoop: (hookContext: {
        args: [models.ProcessorContext];
    }) => Promise<boolean>;
    onError: () => Promise<boolean>;
    afterTrigger: (hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) => Promise<boolean>;
};
