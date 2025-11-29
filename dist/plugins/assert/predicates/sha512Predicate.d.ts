import { TestPredicate } from './testPredicate';
export declare class SHA512Predicate implements TestPredicate {
    readonly id: string[];
    noAutoConvert: boolean;
    match(value: unknown, expected: unknown): boolean;
}
