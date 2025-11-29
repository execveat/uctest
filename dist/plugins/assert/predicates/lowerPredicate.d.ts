import { TestPredicate } from './testPredicate';
export declare class LowerPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
