import { HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare const testExitCodeInterceptor: {
    id: string;
    onError: () => Promise<boolean | undefined>;
    afterTrigger: (hookContext: HookTriggerContext<[models.ProcessorContext], boolean>) => Promise<boolean>;
};
