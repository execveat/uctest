import { TestPredicate } from './testPredicate';
export declare class MD5Predicate implements TestPredicate {
    readonly id: string[];
    noAutoConvert: boolean;
    match(value: unknown, expected: unknown): boolean;
}
