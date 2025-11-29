import * as models from '../../../models';
export declare function transformRequestBodyToBuffer(request: models.Request, context: models.ProcessorContext): Promise<void>;
export declare function transformToBufferOrString(body: models.RequestBody, context: models.ProcessorContext): Promise<string | Buffer>;
export declare function normalizeBody(body: Array<models.HttpRequestBodyLine>, context: models.ProcessorContext): Promise<Buffer | string>;
