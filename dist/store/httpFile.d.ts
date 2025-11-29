import * as models from '../models';
export declare class HttpFile implements models.HttpFile {
    fileName: models.PathLike;
    readonly rootDir?: models.PathLike | undefined;
    constructor(fileName: models.PathLike, rootDir?: models.PathLike | undefined);
    readonly hooks: {
        parse: models.ParseHook;
        parseMetaData: models.ParseMetaDataHook;
        parseEndRegion: models.ParseEndRegionHook;
        provideAssertValue: models.ProvideAssertValue;
        replaceVariable: models.ReplaceVariableHook;
        provideEnvironments: models.ProvideEnvironmentsHook;
        provideVariables: models.ProvideVariablesHook;
        execute: models.ExecuteHook;
        onStreaming: models.OnStreaming;
        onRequest: models.OnRequestHook;
        onResponse: models.OnResponseHook;
        responseLogging: models.ResponseLoggingHook;
    };
    readonly httpRegions: Array<models.HttpRegion>;
    activeEnvironment?: string[];
    findHttpRegion(name: string): models.HttpRegion | undefined;
    get globalHttpRegions(): models.HttpRegion[];
}
