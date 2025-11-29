import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../../models';
export declare class ProcessedHttpRegionInterceptor implements HookInterceptor<[models.ProcessorContext], boolean | void> {
    id: string;
    private emitted;
    getResponseLoggingInterceptor(): HookInterceptor<[
        models.HttpResponse,
        models.ProcessorContext
    ], boolean | void>;
    beforeLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
    onError(_err: unknown, hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
    afterLoop(hookContext: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
    private updateProcessedHttpRegionAfterLoop;
    private afterResponseLoggingLoop;
    private toProcessedHttpRegion;
    private emitProcessedHttpRegion;
}
