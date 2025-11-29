import { TestPredicate } from './testPredicate';
export declare class EndsWithPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
