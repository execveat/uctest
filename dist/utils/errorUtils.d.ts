import { ErrorDescription } from '../models';
export declare function isError(val: unknown): val is Error & {
    handled?: boolean;
};
export declare function parseError(err: Error): ErrorDescription;
export declare function errorToString(err: unknown): string | undefined;
export declare function useDefaultOnError<T>(promise: Promise<T>, defaultVal: T): Promise<T>;
