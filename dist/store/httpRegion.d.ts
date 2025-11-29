import * as models from '../models';
export declare class HttpRegion implements models.HttpRegion {
    private readonly httpFile;
    request?: models.Request<string, models.RequestBody> | undefined;
    response?: models.HttpResponse | undefined;
    testResults?: models.TestResult[] | undefined;
    responseRefs?: string[] | undefined;
    readonly variablesPerEnv: Record<string, models.Variables>;
    readonly metaData: Record<string, string | true | undefined>;
    readonly hooks: {
        execute: models.ExecuteHook;
        onRequest: models.OnRequestHook;
        onStreaming: models.OnStreaming;
        onResponse: models.OnResponseHook;
        responseLogging: models.ResponseLoggingHook;
    };
    readonly symbol: models.HttpSymbol;
    constructor(httpFile: models.HttpFile, start?: number);
    get id(): string;
    isGlobal(): boolean;
    clone(httpFile?: models.HttpFile): HttpRegion;
    execute(context: models.PartialProperty<models.ProcessorContext, 'httpRegion', 'hooks'>, isMainContext?: boolean): Promise<boolean>;
    private dependentsPerEnv;
    private resetDependentRegionsWithVisitor;
    private registerRegionDependent;
}
