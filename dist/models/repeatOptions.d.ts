export declare enum RepeatOrder {
    sequential = 0,
    parallel = 1
}
export interface RepeatOptions {
    type: RepeatOrder;
    count: number;
}
