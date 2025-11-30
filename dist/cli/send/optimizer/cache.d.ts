import { DependencyModel } from './types';
export interface ValidationResult {
    valid: boolean;
    reason?: string;
    file?: string;
}
export declare function loadCache(rootDir: string): Promise<DependencyModel | undefined>;
export declare function saveCache(rootDir: string, model: DependencyModel): Promise<void>;
export declare function validateCache(cached: DependencyModel, rootDir: string): Promise<ValidationResult>;
export declare function findCacheRoot(specPath: string): Promise<string>;
