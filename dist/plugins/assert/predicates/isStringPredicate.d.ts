import { TestPredicate } from './testPredicate';
export declare class IsStringPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown): boolean;
}
