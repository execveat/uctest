import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { ProcessedHttpRegion, TestResultStatus } from '../../models';

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
export class TestProgressBar {
  private bar: cliProgress.SingleBar | null = null;
  private stats: ProgressStats = { success: 0, failed: 0, errored: 0, skipped: 0 };
  private requestedCompleted = 0;
  private seenRequested = new Set<string>(); // Dedupe user-selected tests
  private seenAll = new Set<string>(); // Dedupe all HTTP requests

  constructor(
    private config: ProgressConfig,
    private enabled: boolean
  ) {}

  start() {
    if (!this.enabled) return;

    const total = this.config.requestedRegionIds.size;
    this.bar = new cliProgress.SingleBar({
      format: 'Testing... {bar} {percentage}% | {requested}/{totalRequested} tests | {stats}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: false,
    });

    this.bar.start(total, 0, {
      requested: 0,
      totalRequested: total,
      stats: chalk.gray('starting...'),
    });
  }

  update(processedRegion: ProcessedHttpRegion) {
    if (!this.bar) return;

    // Count all HTTP requests (dedupe by region ID)
    if (!this.seenAll.has(processedRegion.id)) {
      this.seenAll.add(processedRegion.id);
      this.updateStats(processedRegion);
    }

    // Track user-selected test completion (dedupe)
    if (this.config.requestedRegionIds.has(processedRegion.id)) {
      if (!this.seenRequested.has(processedRegion.id)) {
        this.seenRequested.add(processedRegion.id);
        this.requestedCompleted++;
        this.bar.update(this.requestedCompleted, {
          requested: this.requestedCompleted,
          stats: this.formatStats(),
        });
      }
    } else {
      // Update stats display for dependency regions too
      this.bar.update(this.requestedCompleted, {
        stats: this.formatStats(),
      });
    }
  }

  private updateStats(processedRegion: ProcessedHttpRegion) {
    const results = processedRegion.testResults || [];
    const hasError = results.some(t => t.status === TestResultStatus.ERROR);
    const hasFailed = results.some(t => t.status === TestResultStatus.FAILED);
    const hasSkipped = results.some(t => t.status === TestResultStatus.SKIPPED);

    if (hasError) this.stats.errored++;
    else if (hasFailed) this.stats.failed++;
    else if (hasSkipped) this.stats.skipped++;
    else this.stats.success++;
  }

  stop() {
    if (this.bar) {
      this.bar.stop();
    }
  }

  getStats(): ProgressStats {
    return { ...this.stats };
  }

  getTotalExecuted(): number {
    return this.seenAll.size;
  }

  private formatStats(): string {
    const parts: string[] = [];
    if (this.stats.success > 0) parts.push(chalk.green(`${this.stats.success} ✓`));
    if (this.stats.failed > 0) parts.push(chalk.red(`${this.stats.failed} ✗`));
    if (this.stats.errored > 0) parts.push(chalk.red(`${this.stats.errored} ⚠`));
    if (this.stats.skipped > 0) parts.push(chalk.yellow(`${this.stats.skipped} ⊘`));
    return parts.join(' ') || chalk.gray('starting...');
  }
}

export interface ProgressBarOptions {
  json?: boolean;
  jsonl?: boolean;
  verbose?: boolean;
  silent?: boolean;
}

export function shouldShowProgressBar(options: ProgressBarOptions): boolean {
  // Don't show progress bar for JSON output modes or if explicitly verbose/silent
  if (options.json || options.jsonl || options.silent || options.verbose) return false;
  // Only show in TTY (interactive terminal)
  return process.stdout.isTTY === true;
}
