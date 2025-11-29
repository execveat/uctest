import { TestPredicate } from './testPredicate';
export declare class NotEqualsPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
