import { DependencyModel } from './types';
export declare const DYNAMIC_VAR_REGEX: RegExp;
export interface StaticParserOptions {
    files?: string[];
}
export declare function buildDependencyModel(rootDir: string, options?: StaticParserOptions): Promise<DependencyModel>;
export declare function toAbsolutePath(rootDir: string, file: string): string;
