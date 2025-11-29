import { TestPredicate } from './testPredicate';
export declare class GreaterEqualsPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
