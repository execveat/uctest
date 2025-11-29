export declare function isPromise(obj: unknown): obj is Promise<unknown>;
export declare function sleep(timeout: number): Promise<void>;
export declare function promiseQueue<T>(batchSize: number, ...promises: Array<() => Promise<T>>): Promise<T[]>;
