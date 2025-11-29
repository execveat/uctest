import * as models from '../models';
interface ImportProcessorContext extends models.ProcessorContext {
    options: {
        httpFiles?: Array<{
            base: models.HttpFile;
            ref: models.HttpFile;
        }>;
        globalScriptsExecuted?: Array<models.HttpFile>;
    };
}
export declare function isHttpRegionSendContext(context: models.SendContext): context is models.HttpRegionSendContext;
export declare function isHttpRegionsSendContext(context: models.SendContext): context is models.HttpRegionsSendContext;
export declare function findHttpRegionInContext(name: string, context: ImportProcessorContext): models.HttpRegion | undefined;
export declare function importHttpFileInContext(fileName: string, httpFileStore: models.HttpFileStore, context: ImportProcessorContext): Promise<boolean>;
export {};
