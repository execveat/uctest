import { HookInterceptor, HookTriggerContext } from 'hookpoint';
import * as models from '../../models';
export interface ScriptData {
    script: string;
    lineOffset: number;
}
export declare function parseJavascript(getLineReader: models.getHttpLineGenerator, { httpRegion, httpFile, httpFileStore }: models.ParserContext): Promise<models.HttpRegionParserResult>;
export declare class AfterJavascriptHookInterceptor implements HookInterceptor<[models.ProcessorContext], boolean> {
    private readonly scriptData;
    private readonly httpFileStore;
    id: string;
    constructor(scriptData: ScriptData, httpFileStore: models.HttpFileStore);
    afterLoop(context: HookTriggerContext<[models.ProcessorContext], boolean | undefined>): Promise<boolean | undefined>;
}
