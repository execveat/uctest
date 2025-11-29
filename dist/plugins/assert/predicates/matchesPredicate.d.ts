import { TestPredicate } from './testPredicate';
export declare class MatchesPredicate implements TestPredicate {
    readonly id: string[];
    readonly noAutoConvert = true;
    match(value: unknown, expected: unknown): boolean;
}
