import { TestPredicate } from './testPredicate';
export declare class GreaterPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown, expected: unknown): boolean;
}
