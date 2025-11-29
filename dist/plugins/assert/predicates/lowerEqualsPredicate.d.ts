import { TestPredicate } from './testPredicate';
export declare class LowerEqualsPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
