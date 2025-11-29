import * as models from '../models';
export declare function getDisplayName(httpRegion?: models.HttpRegion, defaultName?: string): string;
export declare function getRegionDescription(httpRegion: models.HttpRegion, defaultName?: string): string;
export declare function logResponse(response: models.HttpResponse | undefined, context: models.ProcessorContext): Promise<void>;
export declare function executeGlobalScripts(context: {
    variables: models.Variables;
    httpFile: models.HttpFile;
    options: Record<string, unknown>;
}): Promise<boolean>;
export declare function addHttpFileRequestClientHooks(requestClientHooks: models.RequestClientHooks, httpFile: models.HttpFile): models.RequestClientHooks;
