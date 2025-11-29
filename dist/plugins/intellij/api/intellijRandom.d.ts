export declare class IntellijRandom {
    alphabetic(length?: number): string;
    numeric(length?: number): string;
    hexadecimal(length?: number): string;
    get email(): string;
    float(from?: number, to?: number): number;
    integer(from?: number, to?: number): number;
    get uuid(): string;
    date(date?: Date, format?: string | undefined): string;
}
