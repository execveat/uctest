import { TestPredicate } from './testPredicate';
export declare class StartsWithPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
