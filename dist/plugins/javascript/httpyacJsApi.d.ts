import * as models from '../../models';
export declare class HttpyacJsApi {
    private readonly context;
    private readonly httpFileStore;
    constructor(context: models.ProcessorContext, httpFileStore: models.HttpFileStore);
    findHttpRegionInContext(name: string): models.HttpRegion | undefined;
    import(fileName: string): Promise<boolean>;
    setVariables(vars: models.Variables): void;
    execute(httpRegion: models.HttpRegion | string, vars?: models.Variables): Promise<models.Variables>;
}
