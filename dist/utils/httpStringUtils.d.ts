import { HttpResponse, Request } from '../models';
export declare function toHttpString(response: HttpResponse, options?: {
    responseBody?: boolean;
    requestBody?: boolean;
    prettyPrint?: boolean;
}): string;
export declare function toHttpStringResponse(response: HttpResponse, options?: {
    prettyPrint?: boolean;
    body?: boolean;
}): Array<string>;
export declare function toHttpStringRequest(request: Request, options?: {
    body?: boolean;
}): Array<string>;
export declare function toHttpStringHeader(headers: Record<string, unknown>): Array<string>;
