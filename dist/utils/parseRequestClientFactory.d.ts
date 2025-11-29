import * as models from '../models';
interface RequestParserContext {
    protocol: string;
    method?: string;
    requestClientFactory: (request: models.Request, context: models.ProcessorContext) => models.RequestClient;
    modifyRequest?: (request: models.Request) => void;
    methodRegex: RegExp;
    protocolRegex?: RegExp;
    sessionStore: models.SessionStore;
}
export declare function parseRequestLineFactory(requestContext: RequestParserContext): (getLineReader: models.getHttpLineGenerator, context: models.ParserContext) => Promise<models.HttpRegionParserResult>;
export {};
