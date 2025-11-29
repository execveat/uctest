export interface ErrorDescription {
    error: Error;
    displayMessage: string;
    errorType?: string;
    message?: string;
    file?: string;
    line?: string;
    offset?: string;
}
export declare enum TestResultStatus {
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
    SKIPPED = "SKIPPED",
    ERROR = "ERROR"
}
export interface TestResult {
    message: string;
    status: TestResultStatus;
    error?: ErrorDescription;
}
