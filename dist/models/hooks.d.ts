import { LastOutHook, SeriesHook, WaterfallHook } from 'hookpoint';
import { HttpRegionParserResult } from './httpRegionParserResult';
import { Request } from './httpRequest';
import { HttpResponse } from './httpResponse';
import { getHttpLineGenerator, ParserContext } from './parserContext';
import { ProcessorContext } from './processorContext';
import { VariableProviderContext } from './variableProviderContext';
import { Variables } from './variables';
export interface HttpFileHooks {
    readonly parse: ParseHook;
    readonly parseMetaData: ParseMetaDataHook;
    readonly parseEndRegion: ParseEndRegionHook;
    readonly replaceVariable: ReplaceVariableHook;
    readonly provideEnvironments: ProvideEnvironmentsHook;
    readonly provideVariables: ProvideVariablesHook;
    readonly provideAssertValue: ProvideAssertValue;
    readonly execute: ExecuteHook;
    readonly onStreaming: OnStreaming;
    readonly onRequest: OnRequestHook;
    readonly onResponse: OnResponseHook;
    readonly responseLogging: ResponseLoggingHook;
}
export declare class ParseHook extends LastOutHook<[getHttpLineGenerator, ParserContext], HttpRegionParserResult | false> {
    constructor();
}
export declare class ParseMetaDataHook extends LastOutHook<[string, string | undefined, ParserContext], boolean> {
    constructor();
}
export declare class ProvideAssertValue extends LastOutHook<[
    string,
    string | undefined,
    HttpResponse,
    ProcessorContext
], unknown> {
    constructor();
}
export declare class ParseEndRegionHook extends SeriesHook<[ParserContext], void> {
    constructor();
}
export declare class ProvideVariablesHook extends SeriesHook<[string[] | undefined, VariableProviderContext], Variables> {
    constructor();
}
export declare class ProvideEnvironmentsHook extends SeriesHook<[VariableProviderContext], string[]> {
    constructor();
}
export declare class ReplaceVariableHook extends WaterfallHook<[unknown, string, ProcessorContext], undefined> {
    constructor();
}
export declare class OnRequestHook extends SeriesHook<[Request, ProcessorContext], void> {
    constructor();
}
export declare class OnResponseHook extends SeriesHook<[HttpResponse, ProcessorContext], void> {
    constructor();
}
export declare class OnStreaming extends SeriesHook<[ProcessorContext], void> {
    constructor();
}
export declare class ResponseLoggingHook extends SeriesHook<[HttpResponse, ProcessorContext], void> {
    constructor();
}
export declare class ExecuteHook extends SeriesHook<[ProcessorContext], boolean> {
    constructor();
}
