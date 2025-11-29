export declare function createReaderFactory(startLine: number, lines: Array<string>): (noStopOnMetaTag?: boolean) => Generator<{
    textLine: string;
    line: number;
}, void, unknown>;
