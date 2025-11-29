import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import { Cookie } from 'tough-cookie';
import * as models from '../../models';
export interface CookieSession extends models.UserSession {
    cookie?: Cookie;
}
export declare class CookieJarInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
    id: string;
    beforeTrigger(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
    afterTrigger(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
    private getCookieStorePrefix;
}
