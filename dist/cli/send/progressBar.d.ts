import { ProcessedHttpRegion } from '../../models';
export interface ProgressStats {
    success: number;
    failed: number;
    errored: number;
    skipped: number;
}
export declare class TestProgressBar {
    private totalRequests;
    private enabled;
    private bar;
    private stats;
    private current;
    constructor(totalRequests: number, enabled: boolean);
    start(): void;
    update(processedRegion: ProcessedHttpRegion): void;
    stop(): void;
    getStats(): ProgressStats;
    private formatStats;
}
export interface ProgressBarOptions {
    json?: boolean;
    jsonl?: boolean;
    verbose?: boolean;
    silent?: boolean;
}
export declare function shouldShowProgressBar(options: ProgressBarOptions): boolean;
