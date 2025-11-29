import { TestPredicate } from './testPredicate';
export declare class IsFalsePredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown): boolean;
}
