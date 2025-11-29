import * as models from '../../../models';
import { ContentType, HttpResponse, ResponseHeaders, TextStreamResponse } from './stubs';
export declare class IntellijHttpResponse implements HttpResponse {
    body: string | TextStreamResponse | unknown;
    status: number;
    contentType: ContentType;
    headers: ResponseHeaders;
    constructor(response: models.HttpResponse);
}
export declare class IntellijHeaders implements ResponseHeaders {
    private readonly headers;
    constructor(headers: Record<string, unknown> | undefined);
    valueOf(headerName: string): string | null;
    valuesOf(headerName: string): string[];
}
export declare class IntellijTextStreamResponse implements HttpResponse {
    private readonly requestClient;
    private readonly resolve;
    body: TextStreamResponse;
    status: number;
    contentType: ContentType;
    headers: ResponseHeaders;
    private lazyHeaders;
    constructor(requestClient: models.RequestClient, resolve: () => void);
    onEachLine(subscriber: (line: string | object, unsubscribe: () => void) => void, onFinish?: (() => void) | undefined): void;
    onEachMessage(subscriber: (message: string | object, unsubscribe: () => void, output?: ((answer: string) => void) | undefined) => void, onFinish?: (() => void) | undefined): void;
}
