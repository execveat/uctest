import cliProgress from 'cli-progress';
import chalk from 'chalk';
import { ProcessedHttpRegion, TestResultStatus } from '../../models';

export interface ProgressStats {
  success: number;
  failed: number;
  errored: number;
  skipped: number;
}

export class TestProgressBar {
  private bar: cliProgress.SingleBar | null = null;
  private stats: ProgressStats = { success: 0, failed: 0, errored: 0, skipped: 0 };
  private current = 0;

  constructor(
    private totalRequests: number,
    private enabled: boolean
  ) {}

  start() {
    if (!this.enabled) return;

    this.bar = new cliProgress.SingleBar({
      format: 'Testing... {bar} {percentage}% | {value}/{total} | {stats}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true,
      clearOnComplete: false,
      stopOnComplete: false,
    });

    this.bar.start(this.totalRequests, 0, { stats: chalk.gray('starting...') });
  }

  update(processedRegion: ProcessedHttpRegion) {
    if (!this.bar) return;

    // Count test results
    const results = processedRegion.testResults || [];
    const hasError = results.some(t => t.status === TestResultStatus.ERROR);
    const hasFailed = results.some(t => t.status === TestResultStatus.FAILED);
    const hasSkipped = results.some(t => t.status === TestResultStatus.SKIPPED);

    if (hasError) this.stats.errored++;
    else if (hasFailed) this.stats.failed++;
    else if (hasSkipped) this.stats.skipped++;
    else this.stats.success++;

    this.current++;
    this.bar.update(this.current, { stats: this.formatStats() });
  }

  stop() {
    if (this.bar) {
      this.bar.stop();
    }
  }

  getStats(): ProgressStats {
    return { ...this.stats };
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
