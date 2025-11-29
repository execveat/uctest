import { TestPredicate } from './testPredicate';
export declare class SHA256Predicate implements TestPredicate {
    readonly id: string[];
    noAutoConvert: boolean;
    match(value: unknown, expected: unknown): boolean;
}
