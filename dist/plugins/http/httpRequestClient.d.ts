import { default as got } from 'got';
import * as models from '../../models';
export declare class HttpRequestClient extends models.AbstractRequestClient<typeof got> {
    private readonly request;
    private readonly context;
    constructor(request: models.Request, context: models.ProcessorContext);
    get reportMessage(): string;
    get supportsStreaming(): boolean;
    get nativeClient(): typeof got;
    connect(): Promise<typeof got>;
    private cancelableRequest;
    send(body?: unknown): Promise<void>;
    disconnect(err?: Error): void;
    private registerEvents;
}
