import { ProcessedHttpRegion } from '../../models';
export interface ProgressStats {
    success: number;
    failed: number;
    errored: number;
    skipped: number;
}
export interface ProgressConfig {
    /** IDs of user-selected tests (from CLI filters: path, tags, names) */
    requestedRegionIds: Set<string>;
}
/**
 * Progress bar that tracks completion of user-selected tests.
 *
 * The key metric is: how many of the tests that the user explicitly selected
 * (via path, @tag, or :name filters) have been executed?
 *
 * This is independent of dependency resolution - if running test X requires
 * also running A, B, C as dependencies, the progress bar shows 1/1 test
 * (the user's selection), not 4/4 HTTP requests.
 */
export declare class TestProgressBar {
    private config;
    private enabled;
    private bar;
    private stats;
    private requestedCompleted;
    private seenRequested;
    private seenAll;
    constructor(config: ProgressConfig, enabled: boolean);
    start(): void;
    update(processedRegion: ProcessedHttpRegion): void;
    private updateStats;
    stop(): void;
    getStats(): ProgressStats;
    getTotalExecuted(): number;
    private formatStats;
}
export interface ProgressBarOptions {
    json?: boolean;
    jsonl?: boolean;
    verbose?: boolean;
    silent?: boolean;
}
export declare function shouldShowProgressBar(options: ProgressBarOptions): boolean;
