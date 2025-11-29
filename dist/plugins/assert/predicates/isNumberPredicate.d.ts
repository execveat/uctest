import { TestPredicate } from './testPredicate';
export declare class IsNumberPredicate implements TestPredicate {
    readonly id: string[];
    match(value: unknown): boolean;
}
