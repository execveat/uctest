import { HttpRegion, ProcessorContext, TestFunction, TestResult } from '../models';
export type TestFactoryOptions = {
    ignoreErrorFile: true;
};
export declare function testFactoryAsync({ httpRegion }: ProcessorContext, options: TestFactoryOptions): (message: string, testMethod: (testResult: TestResult) => Promise<void>) => Promise<void>;
export declare function testFactory({ httpRegion, variables }: ProcessorContext): TestFunction;
export declare function addTestResultToHttpRegion(httpRegion: HttpRegion, testResult: TestResult): void;
export declare function addSkippedTestResult(httpRegion: HttpRegion, message?: string): void;
