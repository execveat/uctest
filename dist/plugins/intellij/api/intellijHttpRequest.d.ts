import * as models from '../../../models';
import { HttpClientRequest, PreRequestHttpClientRequest, RequestBody, RequestEnvironment, RequestHeaders, RequestUrl, Variables } from './stubs';
export declare class IntellijHttpClientRequest implements HttpClientRequest {
    private _url;
    method: string;
    private _body;
    headers: RequestHeaders;
    environment: RequestEnvironment;
    variables: Variables;
    url(): string;
    body(): string;
    constructor(context: models.ProcessorContext);
}
export declare class IntellijPreRequestHttpClientRequest implements PreRequestHttpClientRequest {
    url: RequestUrl;
    method: string;
    body: IntellijRequestBody;
    headers: RequestHeaders;
    environment: RequestEnvironment;
    variables: Variables;
    constructor(context: models.ProcessorContext);
}
declare class IntellijRequestBody implements RequestBody {
    private readonly context;
    constructor(context: models.ProcessorContext);
    getRaw(): string;
    tryGetSubstituted(): string;
}
export {};
