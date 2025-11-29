import { ConsoleLogHandler, LogHandler, LogLevel } from '../models';
export declare class Logger implements ConsoleLogHandler {
    readonly options: {
        level?: LogLevel;
        logMethod?: (level: LogLevel, ...params: unknown[]) => void;
        onlyFailedTests?: boolean;
        noTrace?: boolean;
    };
    private readonly parentLogger?;
    private collectCache;
    private priorityCache;
    constructor(options: {
        level?: LogLevel;
        logMethod?: (level: LogLevel, ...params: unknown[]) => void;
        onlyFailedTests?: boolean;
        noTrace?: boolean;
    }, parentLogger?: ConsoleLogHandler | undefined);
    collectMessages(): void;
    flush(): void;
    private flushCache;
    private writeLog;
    info(...params: unknown[]): void;
    log(...params: unknown[]): void;
    trace(...params: unknown[]): void;
    debug(...params: unknown[]): void;
    error(...params: unknown[]): void;
    warn(...params: unknown[]): void;
    logPriority(...msg: Array<string>): void;
    clear(): void;
}
export declare const log: LogHandler;
