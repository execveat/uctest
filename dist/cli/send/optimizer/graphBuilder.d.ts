import { DependencyGraph, DependencyModel, DependencyNode, RegionEntry } from './types';
export interface ResolveOptions {
    filters?: {
        tags?: string[];
        names?: string[];
        line?: number;
    };
}
export declare function buildDependencyGraph(model: DependencyModel): DependencyGraph;
export declare function resolveRefByName(name: string, fromFile: string, model: DependencyModel): RegionEntry | null;
export declare function getVisibleFiles(fromFile: string, model: DependencyModel): string[];
export declare function buildNode(region: RegionEntry): DependencyNode;
