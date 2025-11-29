import { HttpSymbolKind } from './httpSymbolKind';
export declare class HttpSymbol {
    name: string;
    description: string;
    kind: HttpSymbolKind;
    startLine: number;
    startOffset: number;
    endLine: number;
    endOffset: number;
    source?: string;
    children?: Array<HttpSymbol>;
    constructor(options: {
        name: string;
        description: string;
        kind: HttpSymbolKind;
        source?: string;
        startLine: number;
        startOffset: number;
        endLine: number;
        endOffset: number;
        children?: Array<HttpSymbol>;
    });
    getSymbolsForLine(line: number): Array<HttpSymbol>;
    filter(predicate: (symbol: HttpSymbol) => boolean): Array<HttpSymbol>;
}
