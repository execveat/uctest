import * as models from '../models';
export declare function executeRequestClientFactory<T extends models.RequestClient>(requestClientFactory: (request: models.Request, context: models.ProcessorContext) => T, sessionStore: models.SessionStore): (context: models.ProcessorContext) => Promise<boolean>;
export declare function createResponseProxy(response: models.HttpResponse): models.HttpResponse;
