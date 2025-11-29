import { TestPredicate } from './testPredicate';
export declare class IsArrayPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown): boolean;
}
