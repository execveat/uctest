import * as models from '../../models';
export interface IntellijScriptData {
    fileName: string;
}
export declare class IntellijAction {
    private scriptData;
    id: string;
    before: Array<string> | undefined;
    constructor(scriptData: models.ScriptData | IntellijScriptData, beforeReqeust: boolean);
    private isStreamingScript;
    processOnRequest(_request: models.Request, context: models.ProcessorContext): Promise<void>;
    processOnStreaming(context: models.ProcessorContext): Promise<void>;
    processOnResponse(response: models.HttpResponse, context: models.ProcessorContext): Promise<void>;
    private executeScriptData;
    private loadScript;
    private isIntellijScriptData;
}
