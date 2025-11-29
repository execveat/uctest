import * as models from '../models';
export declare function isHttpRequestMethod(method: string | undefined): method is models.HttpMethod;
export declare function isHttpRequest(request: models.Request | undefined): request is models.HttpRequest;
export declare function deleteHeader(headers: Record<string, unknown> | undefined, ...headerNames: string[]): void;
export declare function getHeaderString(headers: Record<string, string | string[] | undefined> | undefined, headerName: string): string | undefined;
export declare function getHeaderBoolean(headers: Record<string, string | string[] | boolean | undefined> | undefined, headerName: string, defaultValue?: boolean): boolean;
export declare function getHeader<T>(headers: Record<string, T> | undefined, headerName: string): T | undefined;
export declare function getHeaderNumber<T>(headers: Record<string, T> | undefined, headerName: string): number | undefined;
export declare function getHeaderArray(headers: Record<string, string | string[] | undefined> | undefined, headerName: string, defaultValue?: Array<string>): Array<string>;
export declare function parseContentType(headers: Record<string, unknown>): models.ContentType | undefined;
export interface JWTToken {
    iss?: string;
    sub?: string;
    aud?: string[];
    exp?: number;
    iat?: number;
    jti?: string;
    scope?: string;
    name?: string;
}
export declare function decodeJWT(str: string): JWTToken | null;
export declare function toQueryParams(params: Record<string, undefined | string | number | boolean | null | Array<string | number | boolean>>): string;
export declare function requestLoggerFactory(log: (args: string) => void, options?: models.RequestLoggerFactoryOptions, optionsFailed?: models.RequestLoggerFactoryOptions): models.RequestLogger;
export declare function getPartOfBody(body: string, length: number | undefined): string | undefined;
export declare function cloneRequest(request: models.Request): models.Request;
export declare function isHttpResponse(val: unknown): val is models.HttpResponse;
export declare function shrinkCloneResponse(response: models.HttpResponse): models.HttpResponse;
export declare function cloneResponse(response: models.HttpResponse): models.HttpResponse;
/**
 * Merges a raw HTTP headers array from a got HTTP Response into a record that
 * groups same-named lower-cased HTTP Headers to arrays of values.
 * I.e. HTTP headers that only appear once will be associated with a single-item string-array,
 * Headers that appear multiple times (e.g. Set-Cookie) are stored in multi-item string-arrays in order of appearance.
 * @param rawHeaders A raw HTTP headers array, even numbered indices represent HTTP header names, odd numbered indices represent header values.
 */
export declare function mergeRawHttpHeaders(rawHeaders: string[]): Record<string, string[]>;
