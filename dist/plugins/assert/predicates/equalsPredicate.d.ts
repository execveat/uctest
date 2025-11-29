import { TestPredicate } from './testPredicate';
export declare class EqualsPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
