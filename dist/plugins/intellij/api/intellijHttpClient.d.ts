import * as models from '../../../models';
import { HttpClient, Variables } from './stubs';
export declare class IntellijHttpClient implements HttpClient {
    private readonly context;
    global: Variables;
    constructor(context: models.ProcessorContext);
    test(testName: string, func: () => void): void;
    assert(condition: boolean, message?: string): void;
    log(text: string): void;
    exit(): void;
}
