import { TestPredicate } from './testPredicate';
export declare class IncludesPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
