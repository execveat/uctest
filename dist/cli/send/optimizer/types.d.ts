export interface DependencyModel {
    version: '1.0';
    generated: string;
    rootDir: string;
    files: Record<string, FileEntry>;
    regions: Record<string, RegionEntry>;
    regionsByName: Record<string, string[]>;
    importGraph: Record<string, string[]>;
    checksums: Record<string, string>;
    mtimes: Record<string, number>;
}
export interface FileEntry {
    path: string;
    checksum: string;
    mtime: number;
    size: number;
    imports: string[];
    regionIds: string[];
    hasGlobalRegion: boolean;
}
export interface RegionEntry {
    id: string;
    modelId: string;
    file: string;
    startLine: number;
    endLine: number;
    name?: string;
    tags: string[];
    refs: string[];
    forceRefs: string[];
    isGlobal: boolean;
}
export interface DependencyGraph {
    nodes: Record<string, DependencyNode>;
}
export interface DependencyNode {
    id: string;
    region: RegionEntry;
    refs: DependencyNode[];
    forceRefs: DependencyNode[];
    dependents: DependencyNode[];
}
export interface ExecutionPlan {
    stages: ExecutionStage[];
    requestedRegionIds: string[];
    stats: ExecutionStats;
}
export interface ExecutionStage {
    units: ScheduledUnit[];
}
export interface ScheduledUnit {
    type: 'region' | 'chain';
    regionIds: string[];
    reason: 'filter_match' | 'ref_dependency' | 'forceRef_chain';
}
export interface ExecutionStats {
    totalRegions: number;
    leafRegions: number;
    dependencyRegions: number;
    forceRefChains: number;
    requestedRegions: number;
}
export interface ForceRefChain {
    id: string;
    regionIds: string[];
    softDeps: Set<string>;
}
export interface SchedulerFilters {
    tags?: string[];
    names?: string[];
    line?: number;
}
export interface ResumeState {
    fileName: string;
    line: number;
    name?: string;
}
