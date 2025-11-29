import * as models from '../models';
export declare const HandlebarsSingleLine: RegExp;
export declare const RegionSeparator: RegExp;
export declare const OAuth2Regex: RegExp;
export type ParseLineMethod = (httpLine: models.HttpLine, context: models.ParserContext) => Promise<models.SymbolParserResult | false>;
export interface ParseSubsequentLinesResult {
    nextLine?: number;
    parseResults: Array<models.SymbolParserResult>;
}
export declare function parseSubsequentLines(lineReader: models.HttpLineGenerator, requestLineParser: Array<ParseLineMethod>, context: models.ParserContext): Promise<ParseSubsequentLinesResult>;
export declare function parseRequestHeaderFactory(headers: Record<string, unknown>): ParseLineMethod;
export declare function parseDefaultHeadersFactory(setHeaders?: (headers: Record<string, unknown>, context: models.ProcessorContext) => void): ParseLineMethod;
export declare function parseUrlLineFactory(attachUrl: (url: string) => void): ParseLineMethod;
export declare function parseQueryLineFactory(attachUrl: (url: string) => void): ParseLineMethod;
export declare function parseComments(httpLine: models.HttpLine, context: models.ParserContext, metaRegex?: RegExp): Promise<models.SymbolParserResult | false>;
export declare const knownMetaData: Array<{
    name: string;
    description: string;
    completions?: Array<string>;
}>;
export declare function parseHandlebarsString(text: unknown, evalExpression: (variable: string, searchValue: string) => Promise<unknown>): Promise<unknown>;
export declare function parseHandlebarsSymbols(line: string | undefined, startLine: number, offset?: number): models.HttpSymbol[];
export declare function parseInlineResponse(getLineReader: models.getHttpLineGenerator, context: models.ParserContext, regex: RegExp): Promise<false | models.HttpRegionParserResultValid>;
export declare function parseFileImport(text: string): {
    fileName: string;
    injectVariables: boolean;
    encoding: BufferEncoding;
} | undefined;
