import * as models from '../../../models';
import { Variables } from './stubs';
export declare class IntellijVariables implements Variables {
    private readonly context;
    private userSession;
    constructor(context: models.ProcessorContext);
    private getIntellijSession;
    private isIntellijGlobalCacheSession;
    set(varName: string, varValue: string): void;
    get(varName: string): string;
    isEmpty(): boolean;
    clear(varName: string): void;
    clearAll(): void;
}
