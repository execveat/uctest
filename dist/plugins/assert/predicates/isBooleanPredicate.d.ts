import { TestPredicate } from './testPredicate';
export declare class IsBooleanPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown): boolean;
}
