import '../registerPlugins';
import * as models from '../models';
export declare function parseHttp(code: string, filename?: string): Promise<models.HttpFile>;
export declare function sendHttp(code: string, variables?: models.Variables): Promise<models.HttpResponse[]>;
export declare function sendHttpFile<T extends models.HttpFileSendContext>(context: T): Promise<models.HttpResponse[]>;
export declare function initFileProvider(files?: Record<string, string> | undefined): void;
export type Directory = {
    childs: Record<string, Directory | string>;
};
export declare function initNestedFileProvider(filesystem: Directory): void;
export declare function initHttpClientProvider(action?: (request: models.Request) => Promise<Partial<models.HttpResponse>>): models.Request<string, models.RequestBody>[];
