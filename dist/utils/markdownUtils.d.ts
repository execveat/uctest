import * as models from '../models';
export declare function toMarkdown(response: models.HttpResponse, options?: {
    responseBody?: boolean;
    requestBody?: boolean;
    timings?: boolean;
    meta?: boolean;
    prettyPrint?: boolean;
    testResults?: Array<models.TestResult>;
}): string;
export declare function toMarkdownResponse(response: models.HttpResponse, options?: {
    prettyPrint?: boolean;
    body?: boolean;
}): Array<string>;
export declare function getMarkdownSyntax(contentType: models.ContentType | undefined): string;
export declare function toMarkdownRequest(request: models.Request, options?: {
    body?: boolean;
}): Array<string>;
export declare function toMarkdownTestResults(testResults: Array<models.TestResult>): Array<string>;
export declare function toMarkdownHeader(headers: Record<string, unknown>): Array<string>;
export declare function toMarkdownMeta(meta: Record<string, unknown>): Array<string>;
export declare function toMarkdownTimings(timings: models.HttpTimings): Array<string>;
export declare function joinMarkdown(lines: string[]): string;
