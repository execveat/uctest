import { StaticParserOptions } from './staticParser';
import { DependencyModel } from './types';
export * from './cache';
export * from './chainDetector';
export * from './executor';
export * from './graphBuilder';
export * from './scheduler';
export * from './staticParser';
export * from './types';
export interface ModelOptions extends StaticParserOptions {
    noCache?: boolean;
}
export declare function loadOrBuildModel(rootDir: string, options?: ModelOptions): Promise<DependencyModel>;
