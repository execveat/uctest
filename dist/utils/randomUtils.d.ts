export declare const randomData: {
    alphabetic: (length?: number) => string;
    numeric: (length?: number) => string;
    hexadecimal: (length?: number) => string;
    email: typeof randomEmail;
    float: (from?: number, to?: number) => number;
    integer: (from?: number, to?: number) => number;
    uuid: () => string;
    date: (date?: Date, format?: string | undefined) => string;
};
export declare function randomEmail(): string;
export declare function randomText(length: number, chars?: string): string;
export declare function randomArrayValue(values: Array<unknown>): unknown;
