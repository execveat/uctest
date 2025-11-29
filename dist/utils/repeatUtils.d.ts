import * as models from '../models';
export declare function repeat(load: () => Promise<models.HttpResponse | void | undefined>, context: {
    repeat?: models.RepeatOptions;
    isMainContext?: boolean;
}): Promise<models.HttpResponse | undefined>;
export declare function mergeResponses(responses: Array<models.HttpResponse>): models.HttpResponse | undefined;
