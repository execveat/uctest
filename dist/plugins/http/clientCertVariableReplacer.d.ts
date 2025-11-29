import * as models from '../../models';
export declare function clientCertVariableReplacer(text: unknown, type: models.VariableType | string, context: models.ProcessorContext): Promise<unknown>;
export declare function addClientCertificateForUrl(urlString: string, request: models.HttpRequest, context: models.ProcessorContext): Promise<void>;
