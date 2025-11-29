import { HttpResponse, ProcessedHttpRegion, TestResult } from '../../models';
import { SendOptions } from './options';
export interface SendJsonOutput {
    _meta: {
        version: string;
    };
    summary: SendRequestSummary & SendTestSummary;
    requests: Array<SendOutputRequest>;
}
export interface SendOutputRequest {
    fileName: string;
    name: string;
    title?: string;
    description?: string;
    line?: number;
    summary: SendTestSummary;
    response?: HttpResponse;
    testResults?: Array<TestResult>;
    timestamp?: string;
    duration?: number;
}
export interface SendRequestSummary {
    totalRequests: number;
    skippedRequests: number;
    failedRequests: number;
    erroredRequests: number;
    successRequests: number;
}
export interface SendTestSummary {
    totalTests: number;
    failedTests: number;
    skippedTests: number;
    erroredTests: number;
    successTests: number;
}
export declare function toSendJsonOutput(processedHttpRegions: Array<ProcessedHttpRegion>, options: SendOptions): SendJsonOutput;
export declare function createTestSummary(requests: Array<SendOutputRequest>): SendRequestSummary & SendTestSummary;
export declare function toSendOutputRequest(httpRegion: ProcessedHttpRegion, options: SendOptions): SendOutputRequest;
