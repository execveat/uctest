import { PathLike, ProcessorContext } from '../../models';
export declare function loadModule<T>(request: string, context: string, force?: boolean): T | undefined;
export declare function runScript(source: string, options: {
    fileName: PathLike;
    lineOffset: number;
    context: Record<string, unknown>;
    deleteVariable?: (key: string) => void;
}): Promise<Record<string, unknown>>;
export declare function evalExpression(expression: string, context: ProcessorContext, scriptContext?: Record<string, unknown>): Promise<unknown>;
export declare function isAllowedKeyword(key: string): boolean;
export declare const HTTPYAC_KEYWORDS: string[];
export declare const JAVASCRIPT_KEYWORDS: string[];
