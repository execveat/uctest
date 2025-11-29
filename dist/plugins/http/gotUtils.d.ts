import { OptionsOfUnknownResponseBody, Response } from 'got';
import * as models from '../../models';
export declare function gotHttpClient(request: models.HttpClientRequest, context: models.HttpClientContext): Promise<models.HttpResponse | false>;
export declare function getClientOptions(request: models.HttpRequest, context: models.HttpClientContext): OptionsOfUnknownResponseBody;
export declare function toHttpResponse(response: Response<unknown>, request: models.Request): {
    name: string;
    statusCode: number;
    protocol: string;
    statusMessage: string | undefined;
    body: unknown;
    rawHeaders: string[];
    rawBody: Buffer<ArrayBufferLike>;
    headers: import("http").IncomingHttpHeaders;
    timings: {
        wait?: number;
        dns?: number;
        tcp?: number;
        tls?: number;
        request?: number;
        firstByte?: number;
        download?: number;
        total?: number;
    };
    httpVersion: string;
    request: {
        protocol: string;
        method: import("got").Method;
        url: string;
        headers: import("got").Headers;
        body: string | Buffer<ArrayBufferLike> | undefined;
    };
    contentType: models.ContentType | undefined;
    meta: {
        ip: string | undefined;
        redirectUrls: string[];
        size: string;
    };
};
export declare function getBody(body: unknown): string | Buffer<ArrayBufferLike> | undefined;
