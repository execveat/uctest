import * as models from '../models';
export declare class TestRequestClient extends models.AbstractRequestClient<undefined> {
    private readonly request;
    private readonly action?;
    constructor(request: models.Request, action?: ((request: models.Request) => Promise<Partial<models.HttpResponse>>) | undefined);
    supportsStreaming: boolean;
    disconnect(err?: Error | undefined): void;
    nativeClient: undefined;
    reportMessage: string;
    connect(): Promise<undefined>;
    send(): Promise<void>;
}
